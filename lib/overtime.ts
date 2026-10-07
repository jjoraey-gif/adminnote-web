'use client';

/**
 * 초과근무 기록알람 (웹)
 *
 * 앱(src/overtime/overtimeNotify.ts)과 **같은 설정 구조**를 쓴다.
 * 스냅샷 키도 앱의 AsyncStorage 키와 동일한 `an_overtime_settings`라서,
 * 웹에서 바꾼 시간이 앱에도 그대로 반영된다.
 *
 * 앱과 결정적으로 다른 점:
 *   앱은 OS에 알림을 예약해두므로 앱을 꺼도 울린다.
 *   웹은 그런 수단이 없어서 **이 탭이 열려 있는 동안만** 울린다.
 *   (다른 탭을 보고 있는 건 괜찮다. 탭을 닫거나 브라우저를 끄면 멈춘다.)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ── 앱과 동일한 상수·타입 ────────────────────────────────────────────────────

export const SNAPSHOT_KEY = 'an_overtime_settings';

export type OvertimeMode = 'weekday' | 'holiday';

/** 평일 초과근무 시작 시각 (오후 6시 고정) */
export const WEEKDAY_START = 18;
/** 평일에 고를 수 있는 종료 시각 — 오후 7시 ~ 밤 12시 */
export const WEEKDAY_END_OPTIONS = [19, 20, 21, 22, 23, 24];
/** 휴일 시작 시각 범위 — 오전 6시 ~ 밤 11시 */
export const HOLIDAY_START_MIN = 6;
export const HOLIDAY_START_MAX = 23;
/** 휴일 종료 시각 최대 — 밤 12시 */
export const HOLIDAY_END_MAX = 24;
/** 알림 분 선택지 (5분 단위) */
export const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5);

export interface OvertimeSettings {
  enabled: boolean;
  mode: OvertimeMode;
  weekdayEndHour: number;
  holidayStartHour: number;
  holidayEndHour: number;
  minute: number;
}

export const DEFAULT_SETTINGS: OvertimeSettings = {
  enabled: false,
  mode: 'weekday',
  weekdayEndHour: 22,
  holidayStartHour: 9,
  holidayEndHour: 18,
  minute: 10,
};

/** 0~24시를 사람이 읽는 표기로 */
export function hourLabel(h: number): string {
  if (h === 24 || h === 0) return '밤 12시';
  if (h === 12) return '낮 12시';
  if (h < 12) return `오전 ${h}시`;
  return `오후 ${h - 12}시`;
}

export function minuteLabel(m: number): string {
  return `${String(m).padStart(2, '0')}분`;
}

function inRange(v: unknown, min: number, max: number, fallback: number): number {
  return Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : fallback;
}

/**
 * 서버 스냅샷에서 읽은 값을 안전한 설정 객체로 정규화한다.
 * 앱의 loadSettings()와 같은 규칙 — 양쪽이 다르면 저장할 때마다 값이 튄다.
 */
export function normalizeSettings(raw: unknown): OvertimeSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const p = raw as Partial<OvertimeSettings>;
  const mode: OvertimeMode = p.mode === 'holiday' ? 'holiday' : 'weekday';
  const holidayStart = inRange(p.holidayStartHour, HOLIDAY_START_MIN, HOLIDAY_START_MAX, DEFAULT_SETTINGS.holidayStartHour);
  return {
    enabled: !!p.enabled,
    mode,
    weekdayEndHour: WEEKDAY_END_OPTIONS.includes(p.weekdayEndHour as number)
      ? (p.weekdayEndHour as number)
      : DEFAULT_SETTINGS.weekdayEndHour,
    holidayStartHour: holidayStart,
    holidayEndHour: inRange(
      p.holidayEndHour,
      holidayStart + 1,
      HOLIDAY_END_MAX,
      Math.max(holidayStart + 1, DEFAULT_SETTINGS.holidayEndHour),
    ),
    minute: MINUTE_OPTIONS.includes(p.minute as number) ? (p.minute as number) : DEFAULT_SETTINGS.minute,
  };
}

/** 설정에 따른 시작·종료 시각 */
export function rangeOf(s: OvertimeSettings): { start: number; end: number } {
  return s.mode === 'weekday'
    ? { start: WEEKDAY_START, end: s.weekdayEndHour }
    : { start: s.holidayStartHour, end: s.holidayEndHour };
}

/** 알림이 울릴 시간대 목록 (시작 ~ 종료 직전). 종료 시각에는 울리지 않는다. */
export function slotHours(s: OvertimeSettings): number[] {
  const { start, end } = rangeOf(s);
  if (end <= start) return [];
  return Array.from({ length: end - start }, (_, i) => start + i);
}

// ── 소리 설정 (브라우저마다 다른 취향이라 이 기기에만 저장) ──────────────────

const SOUND_KEY = 'an_overtime_sound';

export function loadSoundPref(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(SOUND_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function saveSoundPref(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'true' : 'false');
  } catch {
    // 시크릿 모드 등에서 저장이 막혀도 동작에는 문제 없다
  }
}

// ── 알림 권한 ────────────────────────────────────────────────────────────────

export type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

export function notificationPermission(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as PermissionState;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission as PermissionState;
  try {
    return (await Notification.requestPermission()) as PermissionState;
  } catch {
    return 'denied';
  }
}

// ── 알림음 ───────────────────────────────────────────────────────────────────

/**
 * 짧은 "띵-띵" 두 번.
 *
 * 브라우저는 사용자 조작 없이 소리를 못 내게 막는다. 그래서 AudioContext는
 * 저장 버튼을 누른 시점(=사용자 조작)에 만들어 두고 계속 재사용한다.
 */
let audioCtx: AudioContext | null = null;

export function primeAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch {
    audioCtx = null;
  }
}

function beep(): void {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const now = audioCtx.currentTime;
    [0, 0.32].forEach((offset) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      // 급작스런 on/off는 '틱' 잡음이 생기므로 짧게 올렸다 내린다
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.22, now + offset + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + offset + 0.26);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.3);
    });
  } catch {
    // 소리를 못 내도 알림창은 떠야 한다
  }
}

// ── 알람 스케줄러 ────────────────────────────────────────────────────────────

const FIRED_KEY = 'an_overtime_fired';
/** 시각이 지난 뒤 이 시간(분)까지는 늦게라도 알려준다 */
const GRACE_MIN = 10;
const CHECK_MS = 20_000;

function todayStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 이미 알린 시간대는 새로고침 후에도 다시 알리지 않도록 기록해둔다 */
function loadFired(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { date: string; hours: number[] };
    if (parsed.date !== todayStr(new Date())) return new Set();
    return new Set(parsed.hours.map(String));
  } catch {
    return new Set();
  }
}

function saveFired(hours: Set<string>): void {
  try {
    localStorage.setItem(
      FIRED_KEY,
      JSON.stringify({ date: todayStr(new Date()), hours: [...hours].map(Number) }),
    );
  } catch {
    // 저장 실패 시 새로고침하면 한 번 더 알릴 수 있지만 큰 문제는 아니다
  }
}

/**
 * 탭이 열려 있는 동안 설정된 시간대마다 브라우저 알림을 띄운다.
 *
 * 백그라운드 탭에서는 브라우저가 타이머를 1분 간격까지 늦추기 때문에
 * "지금이 정확히 그 분인가"로 판단하면 놓친다. 그래서 예정 시각을 지났는지
 * 비교하고 10분까지는 늦게라도 알리는 방식으로 만들었다.
 */
export function useOvertimeAlarm(settings: OvertimeSettings, soundOn: boolean) {
  const [lastFired, setLastFired] = useState<{ hour: number; at: Date } | null>(null);
  const firedRef = useRef<Set<string> | null>(null);
  const soundRef = useRef(soundOn);
  const settingsRef = useRef(settings);

  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // 설정이 바뀌면 "이미 알린 기록"도 다시 읽는다
  const dayRef = useRef<string>('');

  const check = useCallback(() => {
    const s = settingsRef.current;
    if (!s.enabled) return;
    if (notificationPermission() !== 'granted') return;

    const now = new Date();
    const day = todayStr(now);

    // 날짜가 바뀌면 기록을 비운다
    if (dayRef.current !== day) {
      dayRef.current = day;
      firedRef.current = loadFired();
    }
    if (!firedRef.current) firedRef.current = loadFired();
    const fired = firedRef.current;

    for (const hour of slotHours(s)) {
      if (fired.has(String(hour))) continue;

      const at = new Date(now);
      at.setHours(hour, s.minute, 0, 0);
      const diffMin = (now.getTime() - at.getTime()) / 60_000;
      if (diffMin < 0 || diffMin > GRACE_MIN) continue;

      fired.add(String(hour));
      saveFired(fired);

      try {
        const n = new Notification('초과근무 기록 확인', {
          body: `${hourLabel(hour)} 시간대입니다. 인사랑에서 초과기록 확인을 눌러주세요.`,
          tag: `overtime-${day}-${hour}`,
          requireInteraction: true,
        } as NotificationOptions);
        n.onclick = () => { window.focus(); n.close(); };
      } catch {
        // 알림 생성이 막혀도 소리와 화면 표시는 남긴다
      }

      if (soundRef.current) beep();
      setLastFired({ hour, at: now });
      break; // 한 번에 하나씩만
    }
  }, []);

  useEffect(() => {
    if (!settings.enabled) return;
    check();
    const id = setInterval(check, CHECK_MS);
    // 다른 탭을 보다 돌아온 순간 바로 한 번 확인 — 백그라운드에서 늦어진 걸 만회
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [settings.enabled, check]);

  return { lastFired };
}
