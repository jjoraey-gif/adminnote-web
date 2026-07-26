'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

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
              const dateStr = day
                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                : '';
              const holiday = dateStr ? KOREAN_HOLIDAYS[dateStr] : undefined;
              const isRed = isSun || !!holiday;
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
                    <>
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
                        color: todayCell ? '#fff' : isRed ? '#EF4444' : isSat ? '#3B82F6' : '#1C1C1E',
                      }}>
                        {day}
                      </div>
                      {holiday && (
                        <div style={{ fontSize: 10, color: '#EF4444', marginTop: 3, fontWeight: 600, lineHeight: 1.2, wordBreak: 'keep-all' }}>
                          {holiday}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 선택 날짜 패널 */}
      {selectedDay && (() => {
        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        const hName = KOREAN_HOLIDAYS[ds];
        return (
          <div style={{
            marginTop: 16,
            padding: '14px 20px',
            background: hName ? '#FFF1F1' : '#EFF6FF',
            borderRadius: 12,
            border: `1px solid ${hName ? '#FECACA' : '#BFDBFE'}`,
            fontSize: 14,
            color: hName ? '#DC2626' : '#1D4ED8',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontWeight: 600 }}>{month + 1}월 {selectedDay}일</span>
            {hName
              ? <span style={{ fontWeight: 600 }}>— {hName}</span>
              : <span style={{ color: '#93C5FD' }}>— 앱과 연동 시 해당 날짜 일정이 표시됩니다.</span>
            }
          </div>
        );
      })()}
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
