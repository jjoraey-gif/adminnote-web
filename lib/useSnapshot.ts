'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;       // "yyyy-MM-dd"
  endDate: string;
  category: string;
  isCompleted: boolean;
  color: string;
  startTime: string;
  endTime: string;
  memo: string;
  sortOrder: number;
}

export interface TodoItem {
  id: string;
  title: string;
  date: string;
  isCompleted: boolean;
  createdAt: number;
  completedDate: number | null;
  sortOrder: number;
  topicId: string;
}

// 오늘할 일 주제 (한 주제 안에 여러 항목을 묶는 단위) — 앱과 동일한 모델
export interface TodoTopic {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Seomok {
  id: string;
  code: string;
  name: string;
  budgetAmount: number;
  spentAmount: number;
  nationalRatio: number;
  provincialRatio: number;
  cityRatio: number;
  districtRatio: number;
  countyRatio: number;
}

export interface Pyeonsongmok {
  id: string;
  code: string;
  name: string;
  seomoks: Seomok[];
}

export interface SubProject {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  pyeonsongmoks: Pyeonsongmok[];
}

export interface SnapshotData {
  events: ScheduleEvent[];
  todos: TodoItem[];
  todoTopics: TodoTopic[];
  subProjects: SubProject[];
}

export function useSnapshot(userId: string | undefined) {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);

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
          setData({
            events: (d.events as ScheduleEvent[]) ?? [],
            todos: (d.todos as TodoItem[]) ?? [],
            todoTopics: (d.todoTopics as TodoTopic[]) ?? [],
            subProjects: (d.subProjects as SubProject[]) ?? [],
          });
        }
        setLoading(false);
      });
  }, [userId]);

  return { data, loading };
}

// 색상 헬퍼
export function colorHex(color: string): string {
  switch (color) {
    case 'red': return '#FF5252';
    case 'blue': return '#4D8EFF';
    case 'green': return '#2ECC80';
    case 'pink': return '#FF4081';
    case 'yellow': return '#FFD000';
    case 'purple': return '#BC5FD3';
    case 'orange': return '#FF6B35';
    default: return color.startsWith('#') ? color : '#4D8EFF';
  }
}

export function comma(n: number): string {
  return Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
