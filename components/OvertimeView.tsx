'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  OvertimeSettings, OvertimeMode,
  WEEKDAY_START, WEEKDAY_END_OPTIONS,
  HOLIDAY_START_MIN, HOLIDAY_START_MAX, HOLIDAY_END_MAX,
  MINUTE_OPTIONS, hourLabel, minuteLabel, slotHours,
  primeAudio,
  notificationPermission, requestNotificationPermission,
  PermissionState,
} from '@/lib/overtime';

const BLUE = '#2563EB';
const RED = '#DC2626';
const GRAY = '#6B7280';

interface Props {
  settings: OvertimeSettings;
  onSave: (s: OvertimeSettings) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  /** 가장 최근에 울린 알림 — 알람 자체는 MainLayout에서 돌린다 */
  lastFired: { hour: number; at: Date } | null;
}

export default function OvertimeView({ settings, onSave, soundOn, onToggleSound, lastFired }: Props) {
  // 서버에서 내려온 값을 편집용 로컬 상태로 둔다 (저장 버튼을 눌러야 반영)
  const [s, setS] = useState<OvertimeSettings>(settings);
  const [perm, setPerm] = useState<PermissionState>('default');
  const [savedMsg, setSavedMsg] = useState('');

  // 앱이나 다른 기기에서 바뀌면 편집 중이 아닐 때 따라간다
  useEffect(() => { setS(settings); }, [settings]);

  useEffect(() => { setPerm(notificationPermission()); }, []);

  const hours = useMemo(() => slotHours(s), [s]);

  const holidayStarts = useMemo(
    () => Array.from({ length: HOLIDAY_START_MAX - HOLIDAY_START_MIN + 1 }, (_, i) => HOLIDAY_START_MIN + i),
    [],
  );
  // 시작을 고르면 그 이후 시각만 종료로 고를 수 있다
  const holidayEnds = useMemo(
    () => Array.from({ length: HOLIDAY_END_MAX - s.holidayStartHour }, (_, i) => s.holidayStartHour + 1 + i),
    [s.holidayStartHour],
  );

  const setMode = (mode: OvertimeMode) => setS(p => ({ ...p, mode }));

  const setHolidayStart = (h: number) =>
    setS(p => ({
      ...p,
      holidayStartHour: h,
      holidayEndHour: p.holidayEndHour <= h ? Math.min(h + 1, HOLIDAY_END_MAX) : p.holidayEndHour,
    }));

  const handleSave = async () => {
    if (s.enabled && hours.length === 0) {
      setSavedMsg('종료 시각이 시작 시각보다 뒤여야 합니다.');
      return;
    }
    if (soundOn) primeAudio();

    if (s.enabled) {
      const result = await requestNotificationPermission();
      setPerm(result);
      if (result !== 'granted') {
        setSavedMsg(
          result === 'denied'
            ? '브라우저에서 알림이 차단돼 있습니다. 주소창 왼쪽 자물쇠 → 알림을 허용으로 바꿔주세요.'
            : '알림을 허용해야 알려드릴 수 있습니다.',
        );
        return;
      }
    }

    onSave(s);
    setSavedMsg(s.enabled ? '저장했습니다. 이 탭이 열려 있는 동안 알려드립니다.' : '알림을 껐습니다.');
    setTimeout(() => setSavedMsg(''), 6000);
  };

  const unsupported = perm === 'unsupported';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '8px 0 40px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>초과근무 기록알람</h2>
      <p style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, margin: '0 0 20px' }}>
        설정한 시간대마다 한 번씩 알려드립니다. 인사랑에서 초과기록 확인을 누르는 걸 놓치지 않도록요.
      </p>

      {/* 탭을 닫으면 안 온다는 점은 분명히 알려야 한다 */}
      <div style={{
        background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
        padding: '12px 14px', fontSize: 13, color: '#92400E', lineHeight: 1.6, marginBottom: 20,
      }}>
        웹 알림은 <strong>이 탭이 열려 있는 동안만</strong> 울립니다. 다른 탭을 보고 있는 건 괜찮지만,
        탭을 닫거나 브라우저를 종료하면 멈춥니다. 브라우저를 꺼도 받으려면 <strong>앱</strong>에서
        같은 기능을 설정해 주세요. 설정한 시간은 앱과 자동으로 공유됩니다.
      </div>

      {unsupported && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
          padding: '12px 14px', fontSize: 13, color: '#991B1B', marginBottom: 20,
        }}>
          이 브라우저는 알림을 지원하지 않습니다. 최신 Chrome이나 Edge에서 사용해 주세요.
        </div>
      )}

      <Card>
        <Row label="알림 사용">
          <Switch on={s.enabled} onToggle={() => setS(p => ({ ...p, enabled: !p.enabled }))} disabled={unsupported} />
        </Row>
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>근무 구분</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['weekday', 'holiday'] as OvertimeMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 10, fontSize: 15, fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${s.mode === m ? BLUE : '#E5E7EB'}`,
                background: s.mode === m ? '#EFF6FF' : '#fff',
                color: s.mode === m ? BLUE : '#374151',
              }}
            >
              {m === 'weekday' ? '평일' : '휴일'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {s.mode === 'weekday' ? (
            <>
              <Field label="시작 시간대">
                <FixedValue>{hourLabel(WEEKDAY_START)}</FixedValue>
              </Field>
              <Field label="종료 시간대">
                <Select
                  value={s.weekdayEndHour}
                  options={WEEKDAY_END_OPTIONS.map(h => ({ value: h, label: hourLabel(h) }))}
                  onChange={(v) => setS(p => ({ ...p, weekdayEndHour: v }))}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="시작 시간대">
                <Select
                  value={s.holidayStartHour}
                  options={holidayStarts.map(h => ({ value: h, label: hourLabel(h) }))}
                  onChange={setHolidayStart}
                />
              </Field>
              <Field label="종료 시간대">
                <Select
                  value={s.holidayEndHour}
                  options={holidayEnds.map(h => ({ value: h, label: hourLabel(h) }))}
                  onChange={(v) => setS(p => ({ ...p, holidayEndHour: v }))}
                />
              </Field>
            </>
          )}
          <Field label="매 시간대 알림" accent>
            <Select
              value={s.minute}
              options={MINUTE_OPTIONS.map(m => ({ value: m, label: minuteLabel(m) }))}
              onChange={(v) => setS(p => ({ ...p, minute: v }))}
              accent
            />
          </Field>
        </div>
      </Card>

      <Card>
        <Row label="알림음">
          <Switch on={soundOn} onToggle={onToggleSound} />
        </Row>
        <p style={{ fontSize: 12, color: GRAY, margin: '8px 0 0' }}>
          알림창과 함께 짧은 소리를 냅니다. 이 설정은 이 브라우저에만 저장됩니다.
        </p>
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>알림 예정 시각</div>
        {hours.length === 0 ? (
          <p style={{ fontSize: 14, color: RED, margin: 0 }}>종료 시각이 시작 시각보다 뒤여야 합니다.</p>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {hours.map(h => (
              <span key={h} style={{
                padding: '6px 10px', borderRadius: 999, background: '#F3F4F6',
                fontSize: 13, color: '#374151', fontVariantNumeric: 'tabular-nums',
              }}>
                {hourLabel(h)} {minuteLabel(s.minute)}
              </span>
            ))}
          </div>
        )}
        <p style={{ fontSize: 12, color: GRAY, margin: '10px 0 0' }}>
          종료 시각에는 울리지 않습니다. 평일·휴일은 시간대를 고르는 방식만 다를 뿐,
          알림은 설정한 시간에 매일 울립니다.
        </p>
      </Card>

      {lastFired && (
        <div style={{
          background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10,
          padding: '12px 14px', fontSize: 13, color: '#065F46', marginBottom: 16,
        }}>
          {hourLabel(lastFired.hour)} 시간대 알림을 보냈습니다
          ({lastFired.at.getHours()}:{String(lastFired.at.getMinutes()).padStart(2, '0')}).
        </div>
      )}

      {savedMsg && (
        <div style={{
          background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10,
          padding: '12px 14px', fontSize: 13, color: '#1E40AF', marginBottom: 16, lineHeight: 1.6,
        }}>
          {savedMsg}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={unsupported}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: unsupported ? '#D1D5DB' : BLUE, color: '#fff',
          fontSize: 16, fontWeight: 700, cursor: unsupported ? 'default' : 'pointer',
        }}
      >
        저장
      </button>
    </div>
  );
}

// ── 작은 UI 조각들 ───────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, marginBottom: 16, background: '#fff',
    }}>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
      {children}
    </div>
  );
}

function Field({ label, accent, children }: { label: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ flex: '1 1 160px', minWidth: 140 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: accent ? RED : '#374151', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function FixedValue({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB',
      background: '#F9FAFB', fontSize: 15, color: GRAY,
    }}>
      {children}
    </div>
  );
}

function Select({ value, options, onChange, accent }: {
  value: number;
  options: { value: number; label: string }[];
  onChange: (v: number) => void;
  accent?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 10,
        border: `1px solid ${accent ? '#FCA5A5' : '#E5E7EB'}`,
        background: '#fff', fontSize: 15, fontWeight: 600,
        color: accent ? RED : '#111827', cursor: 'pointer',
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Switch({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      style={{
        width: 52, height: 30, borderRadius: 999, border: 'none', padding: 3,
        background: disabled ? '#E5E7EB' : on ? BLUE : '#D1D5DB',
        cursor: disabled ? 'default' : 'pointer', transition: 'background 0.15s',
        display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', alignItems: 'center',
      }}
    >
      <span style={{
        width: 24, height: 24, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)', display: 'block',
      }} />
    </button>
  );
}
