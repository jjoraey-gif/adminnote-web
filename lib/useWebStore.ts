'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { ScheduleEvent, TodoItem, SubProject, SnapshotData } from './useSnapshot';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useWebStore(userId: string | undefined) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<SnapshotData>({ events: [], todos: [], subProjects: [] });

  // 최신 state를 ref에 동기화
  useEffect(() => { dataRef.current = { events, todos, subProjects }; }, [events, todos, subProjects]);

  // 초기 로드
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from('user_snapshots')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row?.data) {
          const d = row.data as Record<string, unknown>;
          const ev = (d.events as ScheduleEvent[]) ?? [];
          const td = (d.todos as TodoItem[]) ?? [];
          const sp = (d.subProjects as SubProject[]) ?? [];
          setEvents(ev);
          setTodos(td);
          setSubProjects(sp);
          dataRef.current = { events: ev, todos: td, subProjects: sp };
        }
        setLoading(false);
      });
  }, [userId]);

  // Supabase에 push (debounced)
  const push = useCallback((next: SnapshotData) => {
    if (!userId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase
        .from('user_snapshots')
        .upsert({ user_id: userId, data: next, updated_at: new Date().toISOString() });
    }, 2000);
  }, [userId]);

  // ── 업무일정 CRUD ──────────────────────────────────────────────────────────
  const addEvent = useCallback((e: Omit<ScheduleEvent, 'id' | 'sortOrder'>) => {
    setEvents(prev => {
      const newEvent: ScheduleEvent = { ...e, id: uuid(), sortOrder: prev.length };
      const next = [...prev, newEvent];
      push({ ...dataRef.current, events: next });
      return next;
    });
  }, [push]);

  const updateEvent = useCallback((e: ScheduleEvent) => {
    setEvents(prev => {
      const next = prev.map(x => x.id === e.id ? e : x);
      push({ ...dataRef.current, events: next });
      return next;
    });
  }, [push]);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => {
      const next = prev.filter(x => x.id !== id);
      push({ ...dataRef.current, events: next });
      return next;
    });
  }, [push]);

  const toggleEvent = useCallback((id: string) => {
    setEvents(prev => {
      const next = prev.map(x => x.id === id ? { ...x, isCompleted: !x.isCompleted } : x);
      push({ ...dataRef.current, events: next });
      return next;
    });
  }, [push]);

  // ── 오늘할일 CRUD ──────────────────────────────────────────────────────────
  const addTodo = useCallback((title: string, date?: string) => {
    setTodos(prev => {
      const newTodo: TodoItem = {
        id: uuid(), title, date: date ?? new Date().toISOString().slice(0, 10),
        isCompleted: false, createdAt: Date.now(), completedDate: null,
        sortOrder: prev.length,
      };
      const next = [...prev, newTodo];
      push({ ...dataRef.current, todos: next });
      return next;
    });
  }, [push]);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => {
      const next = prev.map(t => t.id === id
        ? { ...t, isCompleted: !t.isCompleted, completedDate: !t.isCompleted ? Date.now() : null }
        : t);
      push({ ...dataRef.current, todos: next });
      return next;
    });
  }, [push]);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => {
      const next = prev.filter(t => t.id !== id);
      push({ ...dataRef.current, todos: next });
      return next;
    });
  }, [push]);

  // ── 예산 (지출 수정) ───────────────────────────────────────────────────────
  const updateSpent = useCallback((spId: string, pmId: string, smId: string, spent: number) => {
    setSubProjects(prev => {
      const next = prev.map(sp => sp.id !== spId ? sp : {
        ...sp,
        pyeonsongmoks: sp.pyeonsongmoks.map(pm => pm.id !== pmId ? pm : {
          ...pm,
          seomoks: pm.seomoks.map(sm => sm.id === smId ? { ...sm, spentAmount: spent } : sm),
        }),
      });
      push({ ...dataRef.current, subProjects: next });
      return next;
    });
  }, [push]);

  return {
    events, todos, subProjects, loading,
    addEvent, updateEvent, deleteEvent, toggleEvent,
    addTodo, toggleTodo, deleteTodo,
    updateSpent,
  };
}
