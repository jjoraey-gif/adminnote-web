'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

interface Props {
  user?: User;
}

export default function CalendarView({ user }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const isToday = (day: number | null) =>
    day !== null && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* 월 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>
          {year}년 {month + 1}월
        </h2>
        <button onClick={nextMonth} style={navBtn}>›</button>
      </div>

      {/* 달력 */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
        {/* 요일 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, fontWeight: 600, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#6B7280' }}>
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
            {week.map((day, di) => {
              const selected = day !== null && day === selectedDay;
              const todayCell = isToday(day);
              const isSun = di === 0;
              const isSat = di === 6;
              return (
                <div
                  key={di}
                  onClick={() => day && setSelectedDay(day)}
                  style={{
                    minHeight: 96,
                    padding: '10px 12px',
                    cursor: day ? 'pointer' : 'default',
                    background: selected && !todayCell ? '#EFF6FF' : '#fff',
                    borderRight: di < 6 ? '1px solid #F3F4F6' : 'none',
                    transition: 'background 0.1s',
                  }}
                >
                  {day && (
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: todayCell ? '#2563EB' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: todayCell ? 700 : 400,
                      color: todayCell ? '#fff' : isSun ? '#EF4444' : isSat ? '#3B82F6' : '#1C1C1E',
                    }}>
                      {day}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 선택 날짜 패널 */}
      {selectedDay && (
        <div style={{
          marginTop: 16,
          padding: '14px 20px',
          background: '#EFF6FF',
          borderRadius: 12,
          border: '1px solid #BFDBFE',
          fontSize: 14,
          color: '#1D4ED8',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontWeight: 600 }}>{month + 1}월 {selectedDay}일</span>
          <span style={{ color: '#93C5FD' }}>— 앱과 연동 시 해당 날짜 일정이 표시됩니다.</span>
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  width: 36,
  height: 36,
  cursor: 'pointer',
  fontSize: 18,
  color: '#374151',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
