'use client';

import { useMemo, useState } from 'react';
import { TodoItem } from '@/lib/useSnapshot';

interface Props {
  todos: TodoItem[];
  onAdd: (title: string, date?: string) => void;
  onUpdate: (id: string, title: string, date: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

type MainTab = 'today' | 'recent';
type Filter = 'today' | 'all' | 'completed';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

function EditModal({ todo, onClose, onSave }: { todo: TodoItem; onClose: () => void; onSave: (title: string, date: string) => void }) {
  const [title, setTitle] = useState(todo.title);
  const [date, setDate] = useState(todo.date);
  const canSave = !!title.trim();

  return (
    <div
      onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: 400, maxWidth: '90vw', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>할 일 수정</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280' }}>✕</button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>내용 *</div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canSave && (onSave(title.trim(), date), onClose())}
            autoFocus
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 13, color: '#6B7280', margin: '12px 0 6px' }}>날짜</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <button
            onClick={() => { if (canSave) { onSave(title.trim(), date); onClose(); } }}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: canSave ? '#2563EB' : '#E5E7EB',
              color: canSave ? '#fff' : '#9CA3AF',
              fontSize: 15, fontWeight: 600, cursor: canSave ? 'pointer' : 'default',
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function TodoRow({ todo, onToggle, onEdit, onDelete }: { todo: TodoItem; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', background: '#fff',
      border: '1px solid #E5E7EB', borderRadius: 12,
      opacity: todo.isCompleted ? 0.6 : 1,
    }}>
      <button
        onClick={onToggle}
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
      <button onClick={onEdit} title="수정" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9CA3AF', padding: '4px', lineHeight: 1, flexShrink: 0 }}>✏️</button>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#D1D5DB', padding: '4px', lineHeight: 1, flexShrink: 0 }}>✕</button>
    </div>
  );
}

export default function TodoView({ todos, onAdd, onUpdate, onToggle, onDelete }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('today');
  const [filter, setFilter] = useState<Filter>('today');
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState<TodoItem | null>(null);

  const todayStr = localDateStr(new Date());

  const isTodayItem = (t: TodoItem) => {
    if (t.date === todayStr || t.date === '') return true;
    if (t.date < todayStr) {
      if (!t.isCompleted) return true;
      if (t.completedDate != null) {
        if (localDateStr(new Date(t.completedDate)) === todayStr) return true;
      }
    }
    return false;
  };

  const filtered = todos.filter(t => {
    if (filter === 'today') return isTodayItem(t);
    if (filter === 'completed') return t.isCompleted;
    return true;
  }).sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return a.sortOrder - b.sortOrder;
  });

  const todayCount = todos.filter(isTodayItem).length;
  const todayDone = todos.filter(t => isTodayItem(t) && t.isCompleted).length;

  // 최근한달: 30일 내 완료 항목, 날짜별 그룹
  const recentByDate = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const items = todos
      .filter(t => t.isCompleted && t.completedDate != null && t.completedDate >= cutoff)
      .sort((a, b) => (b.completedDate ?? 0) - (a.completedDate ?? 0));
    const map = new Map<string, TodoItem[]>();
    for (const t of items) {
      const d = localDateStr(new Date(t.completedDate!));
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    }
    return Array.from(map.entries());
  }, [todos]);

  const recentTotal = recentByDate.reduce((s, [, items]) => s + items.length, 0);

  const handleAdd = () => {
    const title = input.trim();
    if (!title) return;
    onAdd(title, todayStr);
    setInput('');
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>

      {/* 메인 탭 — 오늘 / 최근한달 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['today', 'recent'] as MainTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 24, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: mainTab === tab ? '#2563EB' : '#F3F4F6',
              color: mainTab === tab ? '#fff' : '#6B7280',
            }}
          >
            {tab === 'today' ? '오늘' : '최근 한달'}
          </button>
        ))}
      </div>

      {mainTab === 'today' ? (
        <>
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

          {/* 서브 필터 탭 */}
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
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  onToggle={() => onToggle(todo.id)}
                  onEdit={() => setEditing(todo)}
                  onDelete={() => onDelete(todo.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* 최근한달 헤더 */}
          <div style={{
            padding: '14px 20px', background: '#F0FDF4', borderRadius: 14,
            border: '1px solid #BBF7D0', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontSize: 14, color: '#15803D', fontWeight: 600, marginBottom: 2 }}>최근 30일 완료 현황</div>
              <div style={{ fontSize: 13, color: '#16A34A' }}>
                {recentTotal === 0 ? '완료된 항목이 없습니다' : `총 ${recentTotal}건 완료`}
              </div>
            </div>
          </div>

          {/* 날짜별 그룹 */}
          {recentByDate.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: 14 }}>
              최근 한달간 완료된 할 일이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {recentByDate.map(([dateStr, items]) => (
                <div key={dateStr}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: '#6B7280',
                    marginBottom: 8, paddingLeft: 4,
                  }}>
                    {dateLabel(dateStr)} · {items.length}건
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map(todo => (
                      <TodoRow
                        key={todo.id}
                        todo={todo}
                        onToggle={() => onToggle(todo.id)}
                        onEdit={() => setEditing(todo)}
                        onDelete={() => onDelete(todo.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editing && (
        <EditModal
          todo={editing}
          onClose={() => setEditing(null)}
          onSave={(title, date) => onUpdate(editing.id, title, date)}
        />
      )}
    </div>
  );
}
