'use client';

import { useMemo, useState } from 'react';
import { ScheduleEvent, colorHex } from '@/lib/useSnapshot';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const COLORS = ['blue', 'red', 'green', 'pink', 'yellow', 'purple'];

const KOREAN_HOLIDAYS: Record<string, string> = {
  '2025-01-01': '신정', '2025-01-28': '설 연휴', '2025-01-29': '설날', '2025-01-30': '설 연휴',
  '2025-03-01': '3·1절', '2025-05-05': '어린이날', '2025-05-06': '대체공휴일', '2025-06-06': '현충일',
  '2025-08-15': '광복절', '2025-10-03': '개천절', '2025-10-05': '추석 연휴', '2025-10-06': '추석',
  '2025-10-07': '추석 연휴', '2025-10-08': '대체공휴일', '2025-10-09': '한글날', '2025-12-25': '성탄절',
  '2026-01-01': '신정', '2026-02-16': '설 연휴', '2026-02-17': '설날', '2026-02-18': '설 연휴',
  '2026-02-20': '대체공휴일', '2026-03-01': '3·1절', '2026-03-02': '대체공휴일', '2026-05-01': '노동절',
  '2026-05-05': '어린이날', '2026-05-24': '부처님오신날', '2026-06-06': '현충일', '2026-07-17': '제헌절',
  '2026-08-15': '광복절', '2026-08-17': '대체휴일',
  '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절', '2026-10-05': '대체휴일', '2026-10-09': '한글날', '2026-12-25': '성탄절',
  '2027-01-01': '신정', '2027-02-06': '설 연휴', '2027-02-07': '설날', '2027-02-08': '설 연휴',
  '2027-02-09': '대체휴일', '2027-03-01': '3·1절', '2027-05-03': '대체휴일', '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날', '2027-06-06': '현충일', '2027-07-19': '대체휴일',
  '2027-08-15': '광복절', '2027-08-16': '대체휴일',
  '2027-09-14': '추석 연휴', '2027-09-15': '추석', '2027-09-16': '추석 연휴',
  '2027-10-03': '개천절', '2027-10-04': '대체휴일', '2027-10-09': '한글날', '2027-10-11': '대체휴일',
  '2027-12-25': '성탄절', '2027-12-27': '대체휴일',
};

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "YYYY-MM-DD"를 기기 로컬 자정 기준 Date로 (new Date(str)은 UTC로 읽혀 하루 밀린다) */
function fromDateStr(s: string) {
  return new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
}

interface Props {
  events: ScheduleEvent[];
  onAdd: (e: Omit<ScheduleEvent, 'id' | 'sortOrder'>) => void;
  onUpdate: (e: ScheduleEvent) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

interface FormState {
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  category: string;
  color: string;
  memo: string;
}

const emptyForm = (date: string): FormState => ({
  title: '', date, endDate: '', startTime: '', endTime: '',
  category: '일', color: 'blue', memo: '',
});

const eventToForm = (e: ScheduleEvent): FormState => ({
  title: e.title,
  date: e.date,
  endDate: e.endDate || '',
  startTime: e.startTime || '',
  endTime: e.endTime || '',
  category: e.category || '',
  color: e.color || 'blue',
  memo: e.memo || '',
});

// 주(week)별 다일 이벤트 스패닝 레이아웃
interface WeekEventSlot {
  event: ScheduleEvent;
  lane: number;
  colStart: number;
  colEnd: number;
  isStart: boolean;
  isEnd: boolean;
}

function layoutWeekEvents(
  weekDateStrs: string[],
  allEvents: ScheduleEvent[],
): WeekEventSlot[] {
  if (!weekDateStrs.length) return [];
  const wStart = weekDateStrs[0];
  const wEnd = weekDateStrs[weekDateStrs.length - 1];

  const relevant = allEvents
    .filter(e => {
      const eEnd = e.endDate || e.date;
      return e.date <= wEnd && eEnd >= wStart;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder);

  const laneEndDate: string[] = [];
  const slots: WeekEventSlot[] = [];

  for (const event of relevant) {
    const eEnd = event.endDate || event.date;

    let lane = laneEndDate.findIndex(ed => ed < event.date);
    if (lane === -1) { lane = laneEndDate.length; laneEndDate.push(''); }
    laneEndDate[lane] = eEnd < wEnd ? eEnd : wEnd;

    let colStart = -1, colEnd = -1;
    for (let i = 0; i < 7; i++) {
      const d = weekDateStrs[i];
      if (colStart === -1 && d >= event.date) colStart = i;
      if (d <= eEnd) colEnd = i;
    }
    if (colStart === -1 || colEnd === -1) continue;

    slots.push({
      event,
      lane,
      colStart,
      colEnd,
      isStart: event.date >= wStart,
      isEnd: eEnd <= wEnd,
    });
  }

  return slots;
}

export default function ScheduleView({ events, onAdd, onUpdate, onDelete, onToggle }: Props) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  // 달력을 월이 아니라 "연속된 주"로 본다. 앞뒤 주가 늘 함께 보이도록.
  const [anchor, setAnchor] = useState<string>(todayStr);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(toDateStr(today.getFullYear(), today.getMonth(), today.getDate())));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);

  // 기준일이 속한 주의 일요일에서 한 주 앞으로 물러난 지점부터 WEEK_COUNT주를 그린다.
  // 그래서 화면에는 늘 "지난 주 + 이번 주 + 다음 주들"이 함께 보인다.
  const WEEK_COUNT = 6;
  const weeks: string[][] = useMemo(() => {
    const base = fromDateStr(anchor);
    base.setDate(base.getDate() - base.getDay() - 7);
    const out: string[][] = [];
    for (let w = 0; w < WEEK_COUNT; w++) {
      const row: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + w * 7 + i);
        row.push(toDateStr(d.getFullYear(), d.getMonth(), d.getDate()));
      }
      out.push(row);
    }
    return out;
  }, [anchor]);

  // 화면에 가장 많이 걸친 달을 제목으로 쓴다
  const focusMonth = weeks[Math.floor(WEEK_COUNT / 2)]?.[3] ?? anchor;
  const focusY = Number(focusMonth.slice(0, 4));
  const focusM = Number(focusMonth.slice(5, 7)) - 1;

  const shiftWeek = (delta: number) => {
    const d = fromDateStr(anchor);
    d.setDate(d.getDate() + delta * 7);
    setAnchor(toDateStr(d.getFullYear(), d.getMonth(), d.getDate()));
  };
  const goToday = () => { setAnchor(todayStr); setSelectedDate(todayStr); };

  const eventsOn = (dateStr: string | null): ScheduleEvent[] => {
    if (!dateStr) return [];
    return events.filter(e => {
      const end = e.endDate || e.date;
      return e.date <= dateStr && dateStr <= end;
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const selectedEvents = eventsOn(selectedDate);

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setForm(emptyForm(dateStr));
    setShowForm(false);
    setEditingId(null);
    setEditForm(null);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onAdd({
      title: form.title.trim(),
      date: form.date,
      endDate: form.endDate,
      startTime: form.startTime,
      endTime: form.endTime,
      category: form.category,
      color: form.color,
      memo: form.memo,
      isCompleted: false,
    });
    setShowForm(false);
    setForm(emptyForm(form.date));
  };

  const handleEditStart = (e: ScheduleEvent) => {
    setEditingId(e.id);
    setEditForm(eventToForm(e));
    setShowForm(false);
  };

  const handleEditSave = (original: ScheduleEvent) => {
    if (!editForm || !editForm.title.trim()) return;
    onUpdate({
      ...original,
      title: editForm.title.trim(),
      date: editForm.date,
      endDate: editForm.endDate,
      startTime: editForm.startTime,
      endTime: editForm.endTime,
      category: editForm.category,
      color: editForm.color,
      memo: editForm.memo,
    });
    setEditingId(null);
    setEditForm(null);
  };

  return (
    <div style={{ maxWidth: 1560, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
      {/* 월 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => shiftWeek(-1)} style={navBtn} title="이전 주">‹</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 23, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>
            {focusY}년 {focusM + 1}월
          </h2>
          <button onClick={goToday} style={{
            padding: '6px 14px', border: '1px solid #E5E7EB', borderRadius: 8,
            background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
          }}>오늘</button>
        </div>
        <button onClick={() => shiftWeek(1)} style={navBtn} title="다음 주">›</button>
      </div>

      {/* 달력 */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, fontWeight: 700, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#1C1C1E' }}>{d}</div>
          ))}
        </div>

        {/* 주(week) 렌더링 */}
        {weeks.map((week, wi) => {
          const slots = layoutWeekEvents(week, events);

          return (
            <div key={wi} style={{ position: 'relative', borderBottom: wi < weeks.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
              {/* 날짜 셀 — 원래 높이(120px) 유지 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {week.map((dateStr, di) => {
                  const day = Number(dateStr.slice(8, 10));
                  const inFocus = Number(dateStr.slice(5, 7)) - 1 === focusM;
                  const selected = dateStr === selectedDate;
                  const todayCell = dateStr === todayStr;
                  const isSun = di === 0, isSat = di === 6;
                  const holiday = KOREAN_HOLIDAYS[dateStr];
                  const isRed = isSun || !!holiday;
                  const isFirst = day === 1;   // 달이 바뀌는 날은 표시해준다
                  return (
                    <div key={dateStr} onClick={() => handleDayClick(dateStr)} style={{
                      minHeight: 120,
                      padding: '8px 10px',
                      cursor: 'pointer',
                      background: selected && !todayCell ? '#EFF6FF' : inFocus ? '#fff' : '#FAFAFB',
                      borderRight: di < 6 ? '1px solid #E5E7EB' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
                                    opacity: inFocus ? 1 : 0.45 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: todayCell ? '#2563EB' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: 15, fontWeight: 700,
                          color: todayCell ? '#fff' : isRed ? '#EF4444' : isSat ? '#3B82F6' : '#1C1C1E',
                        }}>{day}</div>
                        {isFirst && !todayCell && (
                          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 700 }}>
                            {Number(dateStr.slice(5, 7))}월
                          </span>
                        )}
                        {holiday && (
                          <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, lineHeight: 1.2, wordBreak: 'keep-all' }}>
                            {holiday}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 이벤트 오버레이 — 날짜 숫자 아래에 절대 위치로 스패닝 바 렌더링 */}
              <div style={{ position: 'absolute', top: 44, left: 0, right: 0, pointerEvents: 'none' }}>
                {slots.map((slot) => {
                  const { event, lane, colStart, colEnd, isStart, isEnd } = slot;
                  const leftPct = (colStart / 7) * 100;
                  const widthPct = ((colEnd - colStart + 1) / 7) * 100;
                  const padL = isStart ? 3 : 0;
                  const padR = isEnd ? 3 : 0;
                  const br = isStart && isEnd ? '4px'
                    : isStart ? '4px 0 0 4px'
                    : isEnd   ? '0 4px 4px 0'
                    : '0';

                  return (
                    <div
                      key={`${event.id}-w${wi}`}
                      onClick={() => handleDayClick(week[colStart])}
                      style={{
                        position: 'absolute',
                        left: `calc(${leftPct}% + ${padL}px)`,
                        width: `calc(${widthPct}% - ${padL + padR}px)`,
                        top: lane * 22,
                        height: 20,
                        background: colorHex(event.color),
                        borderRadius: br,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 5px',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                        pointerEvents: 'auto',
                      }}
                    >
                      {isStart && (
                        <span style={{
                          fontSize: 11,
                          color: '#fff',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                          textAlign: 'center',
                        }}>
                          {event.title.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </div>

      {/* 선택 날짜 패널 */}
      {/* 상단에 고정된 바가 두 개다 — 헤더(0~100px)와 메인 탭바(100~160px).
          둘을 합친 높이보다 아래에 붙여야 패널 윗부분이 탭바에 가려지지 않는다.
          (예전에는 헤더 높이만 계산해 116으로 잡혀 있어 날짜와 추가 버튼이 잘려 보였다)

          내부에 별도 스크롤 영역(overflow-y:auto)을 두지 않는다 — 중첩 스크롤 컨테이너가 있으면
          패널 위에서 마우스 휠을 굴렸을 때 페이지가 아니라 패널 내부만 스크롤되어 버튼이
          화면 스크롤과 함께 움직이지 않는 것처럼 보이는 문제가 있었다. */}
      <div style={{ flex: '0 0 380px', minWidth: 0, position: 'sticky', top: 176, alignSelf: 'flex-start' }}>
      {selectedDate ? (
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 14, paddingBottom: 10, marginBottom: 6,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>
              {Number(selectedDate.slice(5, 7))}월 {Number(selectedDate.slice(8, 10))}일 일정
              {KOREAN_HOLIDAYS[selectedDate] && (
                <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, marginLeft: 8 }}>
                  · {KOREAN_HOLIDAYS[selectedDate]}
                </span>
              )}
            </div>
            <button onClick={() => { setShowForm(v => !v); setEditingId(null); setEditForm(null); }} style={{
              padding: '7px 16px', background: '#2563EB', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {showForm ? '취소' : '+ 일정 추가'}
            </button>
          </div>

          {/* 일정 추가 폼 */}
          {showForm && (
            <EventForm
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              submitLabel="저장"
            />
          )}

          {/* 일정 목록 */}
          {selectedEvents.length === 0 && !showForm ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: 14, background: '#F9FAFB', borderRadius: 12 }}>
              등록된 일정이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedEvents.map(e => (
                <div key={e.id}>
                  {/* 수정 폼 (인라인) */}
                  {editingId === e.id && editForm ? (
                    <EventForm
                      form={editForm}
                      setForm={setEditForm as React.Dispatch<React.SetStateAction<FormState>>}
                      onSubmit={() => handleEditSave(e)}
                      onCancel={() => { setEditingId(null); setEditForm(null); }}
                      submitLabel="수정 저장"
                    />
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px', background: '#fff',
                      border: '1px solid #E5E7EB', borderRadius: 12,
                      borderLeft: `4px solid ${colorHex(e.color)}`,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: e.memo ? 4 : 0 }}>
                          <span style={{
                            fontSize: 15, fontWeight: 600,
                            color: e.isCompleted ? '#9CA3AF' : '#1C1C1E',
                            textDecoration: e.isCompleted ? 'line-through' : 'none',
                          }}>{e.title}</span>
                          {e.category && (
                            <span style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 20 }}>{e.category}</span>
                          )}
                        </div>
                        {e.endDate && e.endDate !== e.date && (
                          <div style={{ fontSize: 12, color: '#6B7280' }}>📅 {e.date} ~ {e.endDate}</div>
                        )}
                        {(e.startTime || e.endTime) && (
                          <div style={{ fontSize: 12, color: '#6B7280' }}>🕐 {e.startTime}{e.endTime ? ` ~ ${e.endTime}` : ''}</div>
                        )}
                        {e.memo && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{e.memo}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => onToggle(e.id)} style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                          border: '1px solid #E5E7EB', background: e.isCompleted ? '#DCFCE7' : '#fff',
                          color: e.isCompleted ? '#16A34A' : '#6B7280',
                        }}>{e.isCompleted ? '완료됨' : '완료'}</button>
                        <button onClick={() => handleEditStart(e)} style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                          border: '1px solid #BFDBFE', background: '#fff', color: '#2563EB',
                        }}>수정</button>
                        <button onClick={() => onDelete(e.id)} style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                          border: '1px solid #FEE2E2', background: '#fff', color: '#EF4444',
                        }}>삭제</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 14, background: '#F9FAFB', borderRadius: 12 }}>
          날짜를 선택하세요.
        </div>
      )}
      </div>
    </div>
  );
}

// 공통 폼 컴포넌트 (추가/수정 공용)
function EventForm({
  form, setForm, onSubmit, onCancel, submitLabel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div style={{
      padding: '16px', background: '#F9FAFB', borderRadius: 12,
      border: '1px solid #E5E7EB', marginBottom: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <input
        value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder="일정 제목 *" style={inputStyle}
        onKeyDown={e => e.key === 'Enter' && onSubmit()}
        autoFocus
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>시작일</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>종료일 (선택)</label>
          <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>시작 시간</label>
          <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>종료 시간</label>
          <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} style={inputStyle} />
        </div>
      </div>
      <input
        value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
        placeholder="카테고리 (예: 회의, 출장)" style={inputStyle}
      />
      <input
        value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
        placeholder="메모 (선택)" style={inputStyle}
      />
      {/* 색상 선택 — 앱과 동일한 색상 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#6B7280' }}>색상</span>
        {COLORS.map(c => (
          <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
            width: 26, height: 26, borderRadius: '50%',
            border: form.color === c ? '3px solid #1C1C1E' : '2px solid transparent',
            background: colorHex(c), cursor: 'pointer', padding: 0,
            outline: form.color === c ? '2px solid #fff' : 'none',
            outlineOffset: '-4px',
          }} title={c} />
        ))}
        <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>
          ← 앱과 동일 색상
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSubmit} style={{
          flex: 1, height: 40, background: '#2563EB', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>{submitLabel}</button>
        <button onClick={onCancel} style={{
          height: 40, padding: '0 16px', background: '#F3F4F6', color: '#6B7280',
          border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
        }}>취소</button>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '0 8px',
  cursor: 'pointer',
  fontSize: 36,
  fontWeight: 300,
  color: '#1C1C1E',
  lineHeight: 1,
};
const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', border: '1px solid #E5E7EB',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4,
};
