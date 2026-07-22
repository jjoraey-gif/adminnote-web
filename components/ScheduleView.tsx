'use client';

import { useState } from 'react';
import { ScheduleEvent, colorHex } from '@/lib/useSnapshot';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const COLORS = ['blue', 'red', 'green', 'pink', 'yellow', 'purple'];

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

export default function ScheduleView({ events, onAdd, onUpdate, onDelete, onToggle }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(toDateStr(today.getFullYear(), today.getMonth(), today.getDate())));

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

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* 월 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>
          {year}년 {month + 1}월
        </h2>
        <button onClick={nextMonth} style={navBtn}>›</button>
      </div>

      {/* 달력 */}
      <div style={{ border: '2px solid #1C1C1E', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#F9FAFB', borderBottom: '2px solid #1C1C1E' }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, fontWeight: 700, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#1C1C1E' }}>{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #1C1C1E' : 'none' }}>
            {week.map((day, di) => {
              const dayEvents = eventsOn(day);
              const selected = day !== null && day === selectedDay;
              const todayCell = isToday(day);
              const isSun = di === 0, isSat = di === 6;
              return (
                <div key={di} onClick={() => day && handleDayClick(day)} style={{
                  minHeight: 120, padding: '8px 10px', cursor: day ? 'pointer' : 'default',
                  background: selected && !todayCell ? '#EFF6FF' : '#fff',
                  borderRight: di < 6 ? '1px solid #1C1C1E' : 'none',
                }}>
                  {day && (
                    <>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: todayCell ? '#2563EB' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: todayCell ? 700 : 400,
                        color: todayCell ? '#fff' : isSun ? '#EF4444' : isSat ? '#3B82F6' : '#1C1C1E',
                        marginBottom: 4,
                      }}>{day}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayEvents.slice(0, 3).map(e => (
                          <div key={e.id} style={{
                            fontSize: 11, fontWeight: 500, color: '#fff',
                            background: colorHex(e.color), borderRadius: 3,
                            padding: '1px 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{e.title}</div>
                        ))}
                        {dayEvents.length > 3 && <div style={{ fontSize: 10, color: '#9CA3AF' }}>+{dayEvents.length - 3}개</div>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 선택 날짜 패널 */}
      {selectedDay && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>
              {month + 1}월 {selectedDay}일 일정
            </div>
            <button onClick={() => setShowForm(v => !v)} style={{
              padding: '7px 16px', background: '#2563EB', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {showForm ? '취소' : '+ 일정 추가'}
            </button>
          </div>

          {/* 일정 추가 폼 */}
          {showForm && (
            <div style={{
              padding: '16px', background: '#F9FAFB', borderRadius: 12,
              border: '1px solid #E5E7EB', marginBottom: 12,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <input
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="일정 제목 *" style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
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
              {/* 색상 선택 */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>색상</span>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                    width: 24, height: 24, borderRadius: '50%', border: form.color === c ? '3px solid #1C1C1E' : '2px solid transparent',
                    background: colorHex(c), cursor: 'pointer', padding: 0,
                  }} />
                ))}
              </div>
              <button onClick={handleSubmit} style={{
                height: 40, background: '#2563EB', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>저장</button>
            </div>
          )}

          {/* 일정 목록 */}
          {selectedEvents.length === 0 && !showForm ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: 14, background: '#F9FAFB', borderRadius: 12 }}>
              등록된 일정이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedEvents.map(e => (
                <div key={e.id} style={{
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
                    <button onClick={() => onDelete(e.id)} style={{
                      fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid #FEE2E2', background: '#fff', color: '#EF4444',
                    }}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #E5E7EB', borderRadius: 8,
  width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: '#374151',
};
const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', border: '1px solid #E5E7EB',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4,
};
