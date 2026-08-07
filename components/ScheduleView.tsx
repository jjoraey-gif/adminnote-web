'use client';

import { useState } from 'react';
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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
  week: (number | null)[],
  allEvents: ScheduleEvent[],
  year: number,
  month: number,
): WeekEventSlot[] {
  const weekDateStrs = week.map(d => (d ? toDateStr(year, month, d) : null));
  const validDates = weekDateStrs.filter(Boolean) as string[];
  if (!validDates.length) return [];
  const wStart = validDates[0];
  const wEnd = validDates[validDates.length - 1];

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
      if (!d) continue;
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
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(toDateStr(today.getFullYear(), today.getMonth(), today.getDate())));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const eventsOn = (day: number | null): ScheduleEvent[] => {
    if (!day) return [];
    const dateStr = toDateStr(year, month, day);
    return events.filter(e => {
      const end = e.endDate || e.date;
      return e.date <= dateStr && dateStr <= end;
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const isToday = (day: number | null) =>
    day !== null && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const selectedEvents = selectedDay ? eventsOn(selectedDay) : [];

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setForm(emptyForm(toDateStr(year, month, day)));
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
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 58%', minWidth: 0 }}>
      {/* 월 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <h2 style={{ fontSize: 23, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>
          {year}년 {month + 1}월
        </h2>
        <button onClick={nextMonth} style={navBtn}>›</button>
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
          const slots = layoutWeekEvents(week, events, year, month);

          return (
            <div key={wi} style={{ position: 'relative', borderBottom: wi < weeks.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
              {/* 날짜 셀 — 원래 높이(120px) 유지 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {week.map((day, di) => {
                  const selected = day !== null && day === selectedDay;
                  const todayCell = isToday(day);
                  const isSun = di === 0, isSat = di === 6;
                  const dateStr = day ? toDateStr(year, month, day) : '';
                  const holiday = dateStr ? KOREAN_HOLIDAYS[dateStr] : undefined;
                  const isRed = isSun || !!holiday;
                  return (
                    <div key={di} onClick={() => day && handleDayClick(day)} style={{
                      minHeight: 120,
                      padding: '8px 10px',
                      cursor: day ? 'pointer' : 'default',
                      background: selected && !todayCell ? '#EFF6FF' : '#fff',
                      borderRight: di < 6 ? '1px solid #E5E7EB' : 'none',
                    }}>
                      {day && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: todayCell ? '#2563EB' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: 15, fontWeight: 700,
                            color: todayCell ? '#fff' : isRed ? '#EF4444' : isSat ? '#3B82F6' : '#1C1C1E',
                          }}>{day}</div>
                          {holiday && (
                            <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, lineHeight: 1.2, wordBreak: 'keep-all' }}>
                              {holiday}
                            </span>
                          )}
                        </div>
                      )}
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
                      onClick={() => { const d = week[colStart]; if (d) handleDayClick(d); }}
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
      <div style={{ flex: 1, minWidth: 0, position: 'sticky', top: 20, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
      {selectedDay ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>
              {month + 1}월 {selectedDay}일 일정
              {KOREAN_HOLIDAYS[toDateStr(year, month, selectedDay)] && (
                <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, marginLeft: 8 }}>
                  · {KOREAN_HOLIDAYS[toDateStr(year, month, selectedDay)]}
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
