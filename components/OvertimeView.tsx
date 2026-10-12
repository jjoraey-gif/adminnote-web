'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  OvertimeSettings, OvertimeMode,
  WEEKDAY_START_OPTIONS, weekdayEndOptions,
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
  // 화면에 보여줄 값. 바꾸는 즉시 저장되므로 서버 값과 거의 같다.
  const [s, setS] = useState<OvertimeSettings>(settings);
  const [perm, setPerm] = useState<PermissionState>('default');
  const [savedMsg, setSavedMsg] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');

  // 앱이나 다른 기기에서 바뀌면 따라간다
  useEffect(() => { setS(settings); }, [settings]);

  useEffect(() => { setPerm(notificationPermission()); }, []);

  const hours = useMemo(() => slotHours(s), [s]);

  const weekdayEnds = useMemo(() => weekdayEndOptions(s.weekdayStartHour), [s.weekdayStartHour]);

  const holidayStarts = useMemo(
    () => Array.from({ length: HOLIDAY_START_MAX - HOLIDAY_START_MIN + 1 }, (_, i) => HOLIDAY_START_MIN + i),
    [],
  );
  // 시작을 고르면 그 이후 시각만 종료로 고를 수 있다
  const holidayEnds = useMemo(
    () => Array.from({ length: HOLIDAY_END_MAX - s.holidayStartHour }, (_, i) => s.holidayStartHour + 1 + i),
    [s.holidayStartHour],
  );

  // ── 자동 저장 ──
  //
  // 앱과 동일하게 저장 버튼을 두지 않는다. 특히 "껐는데 저장을 안 눌러서
  // 알림이 계속 오는" 상황을 없애는 게 핵심이다.
  // 드롭다운은 바로 저장해도 되지만, 호출을 겹치지 않게 살짝 묶어둔다.

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const flash = useCallback(() => {
    setStatus('saved');
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setStatus('idle'), 2000);
  }, []);

  /** 설정 변경 — immediate면 기다리지 않고 바로 저장한다 */
  const update = useCallback((next: OvertimeSettings, immediate = false) => {
    setS(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    const run = () => { onSaveRef.current(next); flash(); };
    if (immediate) run();
    else timerRef.current = setTimeout(run, 400);
  }, [flash]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
  }, []);

  const setMode = (mode: OvertimeMode) => update({ ...s, mode }, true);

  /** 평일 시작을 바꾸면 그보다 뒤인 종료만 남는다 */
  const setWeekdayStart = (h: number) => {
    const options = weekdayEndOptions(h);
    update({
      ...s,
      weekdayStartHour: h,
      weekdayEndHour: options.includes(s.weekdayEndHour) ? s.weekdayEndHour : options[0],
    });
  };

  const setHolidayStart = (h: number) =>
    update({
      ...s,
      holidayStartHour: h,
      holidayEndHour: s.holidayEndHour <= h ? Math.min(h + 1, HOLIDAY_END_MAX) : s.holidayEndHour,
    });

  /** 알림 사용 토글 — 끄기는 즉시, 켜기는 권한을 먼저 받는다 */
  const onToggleEnabled = async () => {
    setSavedMsg('');
    if (s.enabled) {
      update({ ...s, enabled: false }, true);
      return;
    }
    // 소리는 사용자 조작 시점에 열어둬야 나중에 울린다
    if (soundOn) primeAudio();

    const result = await requestNotificationPermission();
    setPerm(result);
    if (result !== 'granted') {
      setSavedMsg(
        result === 'denied'
          ? '브라우저에서 알림이 차단돼 있습니다. 주소창 왼쪽 자물쇠 → 알림을 허용으로 바꿔주세요.'
          : '알림을 허용해야 알려드릴 수 있습니다.',
      );
      return; // 권한이 없으면 켜지 않는다
    }
    update({ ...s, enabled: true }, true);
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
          <Switch on={s.enabled} onToggle={onToggleEnabled} disabled={unsupported} />
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
                <Select
                  value={s.weekdayStartHour}
                  options={WEEKDAY_START_OPTIONS.map(h => ({ value: h, label: hourLabel(h) }))}
                  onChange={setWeekdayStart}
                />
              </Field>
              <Field label="종료 시간대">
                <Select
                  value={s.weekdayEndHour}
                  options={weekdayEnds.map(h => ({ value: h, label: hourLabel(h) }))}
                  onChange={(v) => update({ ...s, weekdayEndHour: v })}
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
                  onChange={(v) => update({ ...s, holidayEndHour: v })}
                />
              </Field>
            </>
          )}
          <Field label="매 시간대 알림" accent>
            <Select
              value={s.minute}
              options={MINUTE_OPTIONS.map(m => ({ value: m, label: minuteLabel(m) }))}
              onChange={(v) => update({ ...s, minute: v })}
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

      {/* 저장 버튼 없이 바로 반영된다 — 그 사실을 알 수 있게 상태만 보여준다.
          자리를 고정해 떴다 사라질 때 화면이 흔들리지 않게 한다. */}
      <div style={{
        height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, fontSize: 13, fontWeight: 600,
        color: '#16A34A', opacity: status === 'saved' ? 1 : 0,
        transition: 'opacity 0.2s',
      }}>
        저장됨
      </div>

      <p style={{ fontSize: 12, color: GRAY, textAlign: 'center', margin: '4px 0 0' }}>
        바꾸는 즉시 저장됩니다.
      </p>
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
