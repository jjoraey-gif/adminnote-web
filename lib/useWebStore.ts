'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { ScheduleEvent, TodoItem, TodoTopic, SubProject, SnapshotData } from './useSnapshot';

export interface PromotionRecord { id: string; grade: string; date: string; note: string; }
export interface AssignmentRecord { id: string; department: string; date: string; }
export interface AwardRecord { id: string; name: string; grade: string; date: string; }
export interface CareerInfo { startDate: string | null; initialGrade: string; stepGrade: number; nextStepUpDate: string | null; }
export const defaultCareerInfo = (): CareerInfo => ({ startDate: null, initialGrade: '9급', stepGrade: 0, nextStepUpDate: null });
export interface PerformanceRating { id: string; date: string; rank: number; }
export interface SameGradePromotion { id: string; date: string; count: number; }
export interface OrgMember { id: string; name: string; position: string; officePhone: string; mobilePhone: string; }
export interface OrgTeam { id: string; name: string; members: OrgMember[]; }
export interface OrgDepartment { id: string; name: string; teams: OrgTeam[]; }

export interface ExternalContact {
  id: string; companyName: string; personName: string; department: string;
  position: string; phone: string; email: string; relatedWork: string; groupId: string | null;
}
export interface ContactGroup { id: string; name: string; color?: string; }

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 앱과 동일하게 최초에는 "기본" 주제 하나로 시작한다.
function defaultTodoTopics(): TodoTopic[] {
  return [{ id: uuid(), name: '기본', sortOrder: 0 }];
}

// 앱 쪽에서 먼저 마이그레이션된 데이터(topicId 없는 레거시 todos)도 웹에서 안전하게 다루기 위한 보정
function ensureTodoTopics(topics: TodoTopic[], todos: TodoItem[]): { topics: TodoTopic[]; todos: TodoItem[] } {
  const t = topics.length > 0 ? topics : defaultTodoTopics();
  const fallbackId = t[0].id;
  const fixedTodos = todos.map(item => item.topicId ? item : { ...item, topicId: fallbackId });
  return { topics: t, todos: fixedTodos };
}

async function saveToSupabase(userId: string, data: Record<string, unknown>, updatedAt: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('user_snapshots')
    .upsert({ user_id: userId, data, updated_at: updatedAt });
  if (error) console.error('[useWebStore] upsert 실패:', error);
}

export function useWebStore(userId: string | undefined) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoTopics, setTodoTopics] = useState<TodoTopic[]>([]);
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [externalContacts, setExternalContacts] = useState<ExternalContact[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [awards, setAwards] = useState<AwardRecord[]>([]);
  const [careerInfo, setCareerInfo] = useState<CareerInfo>(defaultCareerInfo());
  const [performanceRatings, setPerformanceRatings] = useState<PerformanceRating[]>([]);
  const [pastPerformanceRatings, setPastPerformanceRatings] = useState<PerformanceRating[]>([]);
  const [sameGradePromotions, setSameGradePromotions] = useState<SameGradePromotion[]>([]);
  const [orgDepartments, setOrgDepartments] = useState<OrgDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<Record<string, unknown>>({ events: [], todos: [], todoTopics: [], subProjects: [], externalContacts: [], contactGroups: [], promotions: [], assignments: [], awards: [], careerInfo: defaultCareerInfo(), performanceRatings: [], pastPerformanceRatings: [], sameGradePromotions: [], orgDepartments: [] });
  // 아직 저장 안 된 데이터 (flush용)
  const pendingRef = useRef<Record<string, unknown> | null>(null);
  // 내가 마지막으로 저장한 updated_at (에코 방지용)
  const lastSavedAtRef = useRef<string | null>(null);
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // 최신 state를 ref에 동기화 (모든 필드 포함 — 누락 시 push 때 해당 필드가 DB에서 삭제됨)
  useEffect(() => {
    dataRef.current = { ...dataRef.current, events, todos, todoTopics, subProjects };
  }, [events, todos, todoTopics, subProjects]);

  useEffect(() => {
    dataRef.current = { ...dataRef.current, externalContacts, contactGroups };
  }, [externalContacts, contactGroups]);

  useEffect(() => {
    dataRef.current = { ...dataRef.current, promotions, assignments, awards, careerInfo };
  }, [promotions, assignments, awards, careerInfo]);

  useEffect(() => {
    dataRef.current = { ...dataRef.current, performanceRatings, pastPerformanceRatings, sameGradePromotions };
  }, [performanceRatings, pastPerformanceRatings, sameGradePromotions]);

  useEffect(() => {
    dataRef.current = { ...dataRef.current, orgDepartments };
  }, [orgDepartments]);

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
          const rawTd = (d.todos as TodoItem[]) ?? [];
          const rawTopics = (d.todoTopics as TodoTopic[]) ?? [];
          const { topics: tt, todos: td } = ensureTodoTopics(rawTopics, rawTd);
          const sp = (d.subProjects as SubProject[]) ?? [];
          setEvents(ev);
          setTodos(td);
          setTodoTopics(tt);
          setSubProjects(sp);
          const ec = (d.externalContacts as ExternalContact[]) ?? [];
          const cg = (d.contactGroups as ContactGroup[]) ?? [];
          const pr = (d.promotions as PromotionRecord[]) ?? [];
          const as = (d.assignments as AssignmentRecord[]) ?? [];
          const aw = (d.awards as AwardRecord[]) ?? [];
          const ci = (d.careerInfo as CareerInfo) ?? defaultCareerInfo();
          setExternalContacts(ec);
          setContactGroups(cg);
          const prf = (d.performanceRatings as PerformanceRating[]) ?? [];
          const pprf = (d.pastPerformanceRatings as PerformanceRating[]) ?? [];
          const sgp = (d.sameGradePromotions as SameGradePromotion[]) ?? [];
          setPromotions(pr);
          setAssignments(as);
          setAwards(aw);
          setCareerInfo(ci);
          const od = (d.orgDepartments as OrgDepartment[]) ?? [];
          setPerformanceRatings(prf);
          setPastPerformanceRatings(pprf);
          setSameGradePromotions(sgp);
          setOrgDepartments(od);
          dataRef.current = { events: ev, todos: td, todoTopics: tt, subProjects: sp, externalContacts: ec, contactGroups: cg, promotions: pr, assignments: as, awards: aw, careerInfo: ci, performanceRatings: prf, pastPerformanceRatings: pprf, sameGradePromotions: sgp, orgDepartments: od };
        }
        setLoading(false);
      });
  }, [userId]);

  // 페이지 숨김(새로고침/탭닫기) 직전에 pending 데이터를 즉시 저장
  useEffect(() => {
    const flushPending = () => {
      const uid = userIdRef.current;
      const data = pendingRef.current;
      if (!uid || !data) return;
      pendingRef.current = null;
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      // fetch keepalive: 페이지 언로드 후에도 브라우저가 요청을 완료함
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_snapshots`;
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: s }) => {
        const token = s.session?.access_token;
        if (!token) return;
        fetch(url, {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${token}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({ user_id: uid, data, updated_at: new Date().toISOString() }),
        });
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flushPending);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flushPending);
    };
  }, []);

  // Supabase에 push (debounced 1초)
  const push = useCallback((next: Record<string, unknown>) => {
    if (!userId) return;
    pendingRef.current = next; // flush용 최신 데이터 보관
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      pendingRef.current = null;
      const ts = new Date().toISOString();
      lastSavedAtRef.current = ts; // 에코 방지용 타임스탬프 기록
      await saveToSupabase(userId, next, ts);
    }, 1000);
  }, [userId]);

  // Supabase Realtime 구독 — 앱/다른 기기에서 변경 시 자동 반영
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`web_snapshot_sync_${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_snapshots', filter: `user_id=eq.${userId}` },
        (payload: { new: Record<string, unknown> }) => {
          const remoteTs = payload.new.updated_at as string;
          // 로컬 변경 중(pending push)이면 무시
          if (timerRef.current) return;
          // 내가 방금 저장한 데이터이면 무시 (에코 방지)
          if (lastSavedAtRef.current === remoteTs) return;
          // 원격 데이터 적용
          const d = payload.new.data as Record<string, unknown>;
          const ev = (d.events as ScheduleEvent[]) ?? [];
          const rawTd = (d.todos as TodoItem[]) ?? [];
          const rawTopics = (d.todoTopics as TodoTopic[]) ?? [];
          const { topics: tt, todos: td } = ensureTodoTopics(rawTopics, rawTd);
          const sp = (d.subProjects as SubProject[]) ?? [];
          setEvents(ev);
          setTodos(td);
          setTodoTopics(tt);
          setSubProjects(sp);
          setExternalContacts((d.externalContacts as ExternalContact[]) ?? []);
          setContactGroups((d.contactGroups as ContactGroup[]) ?? []);
          setPromotions((d.promotions as PromotionRecord[]) ?? []);
          setAssignments((d.assignments as AssignmentRecord[]) ?? []);
          setAwards((d.awards as AwardRecord[]) ?? []);
          setCareerInfo((d.careerInfo as CareerInfo) ?? defaultCareerInfo());
          setPerformanceRatings((d.performanceRatings as PerformanceRating[]) ?? []);
          setPastPerformanceRatings((d.pastPerformanceRatings as PerformanceRating[]) ?? []);
          setSameGradePromotions((d.sameGradePromotions as SameGradePromotion[]) ?? []);
          setOrgDepartments((d.orgDepartments as OrgDepartment[]) ?? []);
          dataRef.current = { events: ev, todos: td, todoTopics: tt, subProjects: sp, externalContacts: (d.externalContacts as ExternalContact[]) ?? [], contactGroups: (d.contactGroups as ContactGroup[]) ?? [], promotions: (d.promotions as PromotionRecord[]) ?? [], assignments: (d.assignments as AssignmentRecord[]) ?? [], awards: (d.awards as AwardRecord[]) ?? [], careerInfo: (d.careerInfo as CareerInfo) ?? defaultCareerInfo(), performanceRatings: (d.performanceRatings as PerformanceRating[]) ?? [], pastPerformanceRatings: (d.pastPerformanceRatings as PerformanceRating[]) ?? [], sameGradePromotions: (d.sameGradePromotions as SameGradePromotion[]) ?? [], orgDepartments: (d.orgDepartments as OrgDepartment[]) ?? [] };
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // ── 업무일정 CRUD ──────────────────────────────────────────────────────────
  const addEvent = useCallback((e: Omit<ScheduleEvent, 'id' | 'sortOrder'>) => {
    setEvents(prev => {
      const newEvent: ScheduleEvent = { ...e, id: uuid(), sortOrder: prev.length };
      const next = [...prev, newEvent];
      const snapshot = { ...dataRef.current, events: next };
      push(snapshot);
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
  const addTodo = useCallback((title: string, date?: string, topicId?: string) => {
    setTodos(prev => {
      const tId = topicId ?? todoTopics[0]?.id ?? '';
      const newTodo: TodoItem = {
        id: uuid(), title, date: date ?? new Date().toISOString().slice(0, 10),
        isCompleted: false, createdAt: Date.now(), completedDate: null,
        sortOrder: prev.length, topicId: tId,
      };
      const next = [...prev, newTodo];
      push({ ...dataRef.current, todos: next });
      return next;
    });
  }, [push, todoTopics]);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => {
      const next = prev.map(t => t.id === id
        ? { ...t, isCompleted: !t.isCompleted, completedDate: !t.isCompleted ? Date.now() : null }
        : t);
      push({ ...dataRef.current, todos: next });
      return next;
    });
  }, [push]);

  const updateTodo = useCallback((id: string, title: string, date: string) => {
    setTodos(prev => {
      const next = prev.map(t => t.id === id ? { ...t, title, date } : t);
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

  const reorderTodos = useCallback((ids: string[]) => {
    setTodos(prev => {
      const order = new Map(ids.map((id, i) => [id, i] as const));
      const next = prev.map(t => order.has(t.id) ? { ...t, sortOrder: order.get(t.id)! } : t);
      push({ ...dataRef.current, todos: next });
      return next;
    });
  }, [push]);

  // ── 오늘할일 주제 CRUD ─────────────────────────────────────────────────────
  const addTodoTopic = useCallback((name: string) => {
    setTodoTopics(prev => {
      const maxOrder = prev.reduce((m, x) => Math.max(m, x.sortOrder), -1);
      const next = [...prev, { id: uuid(), name, sortOrder: maxOrder + 1 }];
      push({ ...dataRef.current, todoTopics: next });
      return next;
    });
  }, [push]);

  const renameTodoTopic = useCallback((id: string, name: string) => {
    setTodoTopics(prev => {
      const next = prev.map(x => x.id === id ? { ...x, name } : x);
      push({ ...dataRef.current, todoTopics: next });
      return next;
    });
  }, [push]);

  const deleteTodoTopic = useCallback((id: string) => {
    setTodoTopics(prev => {
      const remaining = prev.filter(x => x.id !== id);
      if (remaining.length === 0) return prev; // 마지막 주제는 삭제 불가
      const fallbackId = remaining[0].id;
      // 삭제되는 주제에 속한 할 일은 남은 첫 주제로 재배정
      setTodos(prevTodos => {
        const nextTodos = prevTodos.map(t => t.topicId === id ? { ...t, topicId: fallbackId } : t);
        push({ ...dataRef.current, todos: nextTodos, todoTopics: remaining });
        return nextTodos;
      });
      return remaining;
    });
  }, [push]);

  const reorderTodoTopics = useCallback((ids: string[]) => {
    setTodoTopics(prev => {
      const order = new Map(ids.map((id, i) => [id, i] as const));
      const next = prev.map(x => order.has(x.id) ? { ...x, sortOrder: order.get(x.id)! } : x);
      push({ ...dataRef.current, todoTopics: next });
      return next;
    });
  }, [push]);

  // ── 외부연락처 CRUD ────────────────────────────────────────────────────────
  const addContact = useCallback((c: ExternalContact) => {
    setExternalContacts(prev => {
      const next = [...prev, c];
      push({ ...dataRef.current, externalContacts: next });
      return next;
    });
  }, [push]);

  const updateContact = useCallback((c: ExternalContact) => {
    setExternalContacts(prev => {
      const next = prev.map(x => x.id === c.id ? c : x);
      push({ ...dataRef.current, externalContacts: next });
      return next;
    });
  }, [push]);

  const deleteContact = useCallback((id: string) => {
    setExternalContacts(prev => {
      const next = prev.filter(x => x.id !== id);
      push({ ...dataRef.current, externalContacts: next });
      return next;
    });
  }, [push]);

  const addContactGroup = useCallback((g: ContactGroup) => {
    setContactGroups(prev => {
      const next = [...prev, g];
      push({ ...dataRef.current, contactGroups: next });
      return next;
    });
  }, [push]);

  const updateContactGroup = useCallback((g: ContactGroup) => {
    setContactGroups(prev => {
      const next = prev.map(x => x.id === g.id ? g : x);
      push({ ...dataRef.current, contactGroups: next });
      return next;
    });
  }, [push]);

  const deleteContactGroup = useCallback((id: string) => {
    setContactGroups(prev => {
      const next = prev.filter(g => g.id !== id);
      push({ ...dataRef.current, contactGroups: next });
      return next;
    });
    // 해당 그룹 연락처 → 미분류
    setExternalContacts(prev => {
      const next = prev.map(c => c.groupId === id ? { ...c, groupId: null } : c);
      push({ ...dataRef.current, externalContacts: next });
      return next;
    });
  }, [push]);

  // ── 예산 CRUD ──────────────────────────────────────────────────────────────
  const addSubProject = useCallback((sp: SubProject) => {
    setSubProjects(prev => {
      const next = [...prev, { ...sp, sortOrder: prev.length }];
      push({ ...dataRef.current, subProjects: next });
      return next;
    });
  }, [push]);

  const updateSubProject = useCallback((sp: SubProject) => {
    setSubProjects(prev => {
      const next = prev.map(x => x.id === sp.id ? sp : x);
      push({ ...dataRef.current, subProjects: next });
      return next;
    });
  }, [push]);

  const deleteSubProject = useCallback((id: string) => {
    setSubProjects(prev => {
      const next = prev.filter(x => x.id !== id).map((x, i) => ({ ...x, sortOrder: i }));
      push({ ...dataRef.current, subProjects: next });
      return next;
    });
  }, [push]);

  const reorderSubProjects = useCallback((ids: string[]) => {
    setSubProjects(prev => {
      const map = Object.fromEntries(prev.map(sp => [sp.id, sp]));
      const next = ids.map((id, i) => ({ ...map[id], sortOrder: i }));
      push({ ...dataRef.current, subProjects: next });
      return next;
    });
  }, [push]);

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

  const addSpent = useCallback((spId: string, pmId: string, smId: string, delta: number) => {
    setSubProjects(prev => {
      const next = prev.map(sp => sp.id !== spId ? sp : {
        ...sp,
        pyeonsongmoks: sp.pyeonsongmoks.map(pm => pm.id !== pmId ? pm : {
          ...pm,
          seomoks: pm.seomoks.map(sm => sm.id === smId ? { ...sm, spentAmount: sm.spentAmount + delta } : sm),
        }),
      });
      push({ ...dataRef.current, subProjects: next });
      return next;
    });
  }, [push]);

  // ── 부서조직도 CRUD ────────────────────────────────────────────────────────
  const setDepartments = useCallback((list: OrgDepartment[]) => {
    setOrgDepartments(() => { push({ ...dataRef.current, orgDepartments: list }); return list; });
  }, [push]);
  const addDepartment = useCallback((d: OrgDepartment) => {
    setOrgDepartments(prev => { const next = [...prev, d]; push({ ...dataRef.current, orgDepartments: next }); return next; });
  }, [push]);
  const updateDepartment = useCallback((d: OrgDepartment) => {
    setOrgDepartments(prev => { const next = prev.map(x => x.id === d.id ? d : x); push({ ...dataRef.current, orgDepartments: next }); return next; });
  }, [push]);
  const deleteDepartment = useCallback((id: string) => {
    setOrgDepartments(prev => { const next = prev.filter(x => x.id !== id); push({ ...dataRef.current, orgDepartments: next }); return next; });
  }, [push]);
  const moveMemberToTeam = useCallback((member: OrgMember, srcDeptId: string, srcTeamId: string, tgtDeptId: string, tgtTeamId: string) => {
    setOrgDepartments(prev => {
      const next = prev.map(dept => {
        if (dept.id === srcDeptId) {
          return { ...dept, teams: dept.teams.map(t => t.id === srcTeamId ? { ...t, members: t.members.filter(m => m.id !== member.id) } : t) };
        }
        if (dept.id === tgtDeptId) {
          return { ...dept, teams: dept.teams.map(t => t.id === tgtTeamId ? { ...t, members: [...t.members, member] } : t) };
        }
        return dept;
      });
      push({ ...dataRef.current, orgDepartments: next });
      return next;
    });
  }, [push]);

  // ── 승진순위 CRUD ──────────────────────────────────────────────────────────
  const replacePerformanceRating = useCallback((r: PerformanceRating) => {
    setPerformanceRatings(() => { const next = [r]; push({ ...dataRef.current, performanceRatings: next }); return next; });
  }, [push]);
  const deletePerformanceRating = useCallback((id: string) => {
    setPerformanceRatings(prev => { const next = prev.filter(x => x.id !== id); push({ ...dataRef.current, performanceRatings: next }); return next; });
  }, [push]);
  const addPastPerformanceRating = useCallback((r: PerformanceRating) => {
    setPastPerformanceRatings(prev => { const next = [...prev, r]; push({ ...dataRef.current, pastPerformanceRatings: next }); return next; });
  }, [push]);
  const updatePastPerformanceRating = useCallback((r: PerformanceRating) => {
    setPastPerformanceRatings(prev => { const next = prev.map(x => x.id === r.id ? r : x); push({ ...dataRef.current, pastPerformanceRatings: next }); return next; });
  }, [push]);
  const deletePastPerformanceRating = useCallback((id: string) => {
    setPastPerformanceRatings(prev => { const next = prev.filter(x => x.id !== id); push({ ...dataRef.current, pastPerformanceRatings: next }); return next; });
  }, [push]);
  const addSameGradePromotion = useCallback((p: SameGradePromotion) => {
    setSameGradePromotions(prev => { const next = [...prev, p]; push({ ...dataRef.current, sameGradePromotions: next }); return next; });
  }, [push]);
  const updateSameGradePromotion = useCallback((p: SameGradePromotion) => {
    setSameGradePromotions(prev => { const next = prev.map(x => x.id === p.id ? p : x); push({ ...dataRef.current, sameGradePromotions: next }); return next; });
  }, [push]);
  const deleteSameGradePromotion = useCallback((id: string) => {
    setSameGradePromotions(prev => { const next = prev.filter(x => x.id !== id); push({ ...dataRef.current, sameGradePromotions: next }); return next; });
  }, [push]);
  const clearSameGradePromotions = useCallback(() => {
    setSameGradePromotions(() => { push({ ...dataRef.current, sameGradePromotions: [] }); return []; });
  }, [push]);
  const clearPromotionRankData = useCallback(() => {
    setPerformanceRatings(() => []);
    setPastPerformanceRatings(() => []);
    setSameGradePromotions(() => []);
    push({ ...dataRef.current, performanceRatings: [], pastPerformanceRatings: [], sameGradePromotions: [] });
  }, [push]);

  // ── 이력관리 CRUD ──────────────────────────────────────────────────────────
  const addPromotion = useCallback((p: PromotionRecord) => {
    setPromotions(prev => { const next = [...prev, p]; push({ ...dataRef.current, promotions: next }); return next; });
  }, [push]);
  const updatePromotion = useCallback((p: PromotionRecord) => {
    setPromotions(prev => { const next = prev.map(x => x.id === p.id ? p : x); push({ ...dataRef.current, promotions: next }); return next; });
  }, [push]);
  const deletePromotion = useCallback((id: string) => {
    setPromotions(prev => { const next = prev.filter(x => x.id !== id); push({ ...dataRef.current, promotions: next }); return next; });
  }, [push]);

  const addAssignment = useCallback((a: AssignmentRecord) => {
    setAssignments(prev => { const next = [...prev, a]; push({ ...dataRef.current, assignments: next }); return next; });
  }, [push]);
  const updateAssignment = useCallback((a: AssignmentRecord) => {
    setAssignments(prev => { const next = prev.map(x => x.id === a.id ? a : x); push({ ...dataRef.current, assignments: next }); return next; });
  }, [push]);
  const deleteAssignment = useCallback((id: string) => {
    setAssignments(prev => { const next = prev.filter(x => x.id !== id); push({ ...dataRef.current, assignments: next }); return next; });
  }, [push]);

  const addAward = useCallback((a: AwardRecord) => {
    setAwards(prev => { const next = [...prev, a]; push({ ...dataRef.current, awards: next }); return next; });
  }, [push]);
  const updateAward = useCallback((a: AwardRecord) => {
    setAwards(prev => { const next = prev.map(x => x.id === a.id ? a : x); push({ ...dataRef.current, awards: next }); return next; });
  }, [push]);
  const deleteAward = useCallback((id: string) => {
    setAwards(prev => { const next = prev.filter(x => x.id !== id); push({ ...dataRef.current, awards: next }); return next; });
  }, [push]);

  const updateCareerInfo = useCallback((ci: CareerInfo) => {
    setCareerInfo(ci);
    push({ ...dataRef.current, careerInfo: ci });
  }, [push]);

  return {
    events, todos, todoTopics, subProjects, externalContacts, contactGroups,
    promotions, assignments, awards, careerInfo,
    performanceRatings, pastPerformanceRatings, sameGradePromotions, orgDepartments, loading,
    addEvent, updateEvent, deleteEvent, toggleEvent,
    addTodo, updateTodo, toggleTodo, deleteTodo, reorderTodos,
    addTodoTopic, renameTodoTopic, deleteTodoTopic, reorderTodoTopics,
    addSubProject, updateSubProject, deleteSubProject, reorderSubProjects, updateSpent, addSpent,
    addContact, updateContact, deleteContact,
    addContactGroup, updateContactGroup, deleteContactGroup,
    addPromotion, updatePromotion, deletePromotion,
    addAssignment, updateAssignment, deleteAssignment,
    addAward, updateAward, deleteAward,
    updateCareerInfo,
    replacePerformanceRating, deletePerformanceRating,
    addPastPerformanceRating, updatePastPerformanceRating, deletePastPerformanceRating,
    addSameGradePromotion, updateSameGradePromotion, deleteSameGradePromotion,
    clearSameGradePromotions, clearPromotionRankData,
    setDepartments, addDepartment, updateDepartment, deleteDepartment, moveMemberToTeam,
  };
}
