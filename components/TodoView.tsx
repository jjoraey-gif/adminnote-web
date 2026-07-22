'use client';

import { useState } from 'react';
import { TodoItem } from '@/lib/useSnapshot';

interface Props {
  todos: TodoItem[];
  onAdd: (title: string, date?: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

type Filter = 'today' | 'all' | 'completed';

export default function TodoView({ todos, onAdd, onToggle, onDelete }: Props) {
  const [filter, setFilter] = useState<Filter>('today');
  const [input, setInput] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = todos.filter(t => {
    if (filter === 'today') return t.date === todayStr;
    if (filter === 'completed') return t.isCompleted;
    return true;
  }).sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return a.sortOrder - b.sortOrder;
  });

  const todayCount = todos.filter(t => t.date === todayStr).length;
  const todayDone = todos.filter(t => t.date === todayStr && t.isCompleted).length;

  const handleAdd = () => {
    const title = input.trim();
    if (!title) return;
    onAdd(title, todayStr);
    setInput('');
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* 오늘 진행 현황 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', background: '#EFF6FF', borderRadius: 14,
        border: '1px solid #BFDBFE', marginBottom: 20,
      }}>
        <div>
          <div style={{ fontSize: 14, color: '#1D4ED8', fontWeight: 600, marginBottom: 2 }}>오늘의 할 일</div>
          <div style={{ fontSize: 13, color: '#3B82F6' }}>
            {todayCount === 0 ? '등록된 할 일이 없습니다' : `${todayDone} / ${todayCount} 완료`}
          </div>
        </div>
        {todayCount > 0 && (
          <div style={{ position: 'relative', width: 56, height: 56 }}>
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#BFDBFE" strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none" stroke="#2563EB" strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - todayDone / todayCount)}`}
                strokeLinecap="round" transform="rotate(-90 28 28)"
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#2563EB',
            }}>
              {Math.round((todayDone / todayCount) * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* 할 일 추가 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="할 일을 입력하세요 (Enter)"
          style={{
            flex: 1, height: 44, padding: '0 14px',
            border: '1px solid #E5E7EB', borderRadius: 10,
            fontSize: 14, outline: 'none', color: '#1C1C1E',
          }}
        />
        <button onClick={handleAdd} style={{
          height: 44, padding: '0 20px', background: '#2563EB', color: '#fff',
          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>추가</button>
      </div>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['today', '오늘'], ['all', '전체'], ['completed', '완료']] as [Filter, string][]).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            border: filter === f ? 'none' : '1px solid #E5E7EB',
            background: filter === f ? '#2563EB' : '#fff',
            color: filter === f ? '#fff' : '#6B7280',
          }}>{label}</button>
        ))}
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: 14 }}>
          {filter === 'today' ? '오늘 등록된 할 일이 없습니다.' : '항목이 없습니다.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(todo => (
            <div key={todo.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', background: '#fff',
              border: '1px solid #E5E7EB', borderRadius: 12,
              opacity: todo.isCompleted ? 0.6 : 1,
            }}>
              {/* 체크박스 */}
              <button
                onClick={() => onToggle(todo.id)}
                style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                  border: todo.isCompleted ? 'none' : '2px solid #D1D5DB',
                  background: todo.isCompleted ? '#16A34A' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {todo.isCompleted && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
              </button>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 500, color: '#1C1C1E',
                  textDecoration: todo.isCompleted ? 'line-through' : 'none',
                }}>{todo.title}</div>
                {todo.date && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{todo.date}</div>}
              </div>

              {/* 삭제 */}
              <button onClick={() => onDelete(todo.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, color: '#D1D5DB', padding: '4px',
                lineHeight: 1,
              }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
