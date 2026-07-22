'use client';

import { useState } from 'react';
import { ScheduleEvent, colorHex } from '@/lib/useSnapshot';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

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
}

export default function ScheduleView({ events }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

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

  // 날짜에 해당하는 이벤트 조회 (시작일~종료일 범위 포함)
  const eventsOn = (day: number | null): ScheduleEvent[] => {
    if (!day) return [];
    const dateStr = toDateStr(year, month, day);
    return events.filter(e => {
      const end = e.endDate || e.date;
      return e.date <= dateStr && dateStr <= end;
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const selectedDateStr = selectedDay ? toDateStr(year, month, selectedDay) : null;
  const selectedEvents = selectedDay ? eventsOn(selectedDay) : [];

  const isToday = (day: number | null) =>
    day !== null && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

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
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', padding: '10px 0', fontSize: 12, fontWeight: 600, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#6B7280' }}>{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
            {week.map((day, di) => {
              const dayEvents = eventsOn(day);
              const selected = day !== null && day === selectedDay;
              const todayCell = isToday(day);
              const isSun = di === 0;
              const isSat = di === 6;
              return (
                <div
                  key={di}
                  onClick={() => day && setSelectedDay(day)}
                  style={{
                    minHeight: 88,
                    padding: '8px 10px',
                    cursor: day ? 'pointer' : 'default',
                    background: selected && !todayCell ? '#EFF6FF' : '#fff',
                    borderRight: di < 6 ? '1px solid #F3F4F6' : 'none',
                  }}
                >
                  {day && (
                    <>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: todayCell ? '#2563EB' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: todayCell ? 700 : 400,
                        color: todayCell ? '#fff' : isSun ? '#EF4444' : isSat ? '#3B82F6' : '#1C1C1E',
                        marginBottom: 4,
                      }}>
                        {day}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayEvents.slice(0, 3).map(e => (
                          <div key={e.id} style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#fff',
                            background: colorHex(e.color),
                            borderRadius: 3,
                            padding: '1px 5px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {e.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div style={{ fontSize: 10, color: '#9CA3AF' }}>+{dayEvents.length - 3}개</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 선택 날짜 일정 목록 */}
      {selectedDay && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 10 }}>
            {month + 1}월 {selectedDay}일 일정
          </div>
          {selectedEvents.length === 0 ? (
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
                      {e.isCompleted && (
                        <span style={{ fontSize: 11, color: '#16A34A', background: '#DCFCE7', padding: '2px 7px', borderRadius: 20 }}>완료</span>
                      )}
                    </div>
                    {(e.startTime || e.endTime) && (
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: e.memo ? 2 : 0 }}>
                        🕐 {e.startTime}{e.endTime ? ` ~ ${e.endTime}` : ''}
                      </div>
                    )}
                    {e.memo && <div style={{ fontSize: 12, color: '#6B7280' }}>{e.memo}</div>}
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
