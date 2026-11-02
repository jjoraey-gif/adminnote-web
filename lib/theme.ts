/**
 * 디자인 토큰
 *
 * 화면마다 색·모서리·글자 크기를 직접 적어 쓰다 보니 같은 역할에 다른 값이 섞였다.
 * (회색만 8종, 모서리 12종, 글자 크기 14종)
 *
 * 지금 쓰던 값들을 역할별로 하나씩만 남겨 정리한 것이다. 분위기를 바꾸려는 게 아니라
 * 흩어진 값을 모으는 목적이므로, 새 화면을 만들거나 기존 화면을 손볼 때 여기서 가져다 쓴다.
 */

import type { CSSProperties } from 'react';

// ── 색 ───────────────────────────────────────────────────────────────────────

export const c = {
  /** 본문 글자 */
  text: '#1C1C1E',
  /** 표·목록 본문 글자 — 제목보다 한 단계 연한 검정 */
  textBody: '#374151',
  /** 보조 글자 — 설명, 라벨 */
  textSub: '#6B7280',
  /** 흐린 글자 — 날짜, 안내, 빈 상태 */
  textMuted: '#9CA3AF',
  /** 더 흐린 글자 — placeholder */
  textFaint: '#C7C7CC',

  /** 카드·입력창 바탕 */
  surface: '#FFFFFF',
  /** 살짝 가라앉은 바탕 — 표 머리, 섹션 구분 */
  surfaceSunken: '#F9FAFB',
  /** 페이지 바탕 */
  bg: '#F5F5F7',

  /** 기본 테두리 */
  border: '#E5E7EB',
  /** 옅은 테두리 — 표 안쪽 줄 */
  borderSubtle: '#F3F4F6',
  /** 진한 테두리 — 입력창 포커스 전 강조 */
  borderStrong: '#D1D5DB',

  /** 주조색 */
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  /** 주조색 배경 — 선택된 날짜, 안내 박스 */
  primaryTint: '#EFF6FF',
  primaryTintBorder: '#BFDBFE',

  danger: '#EF4444',
  dangerStrong: '#DC2626',
  dangerTint: '#FEE2E2',

  success: '#16A34A',
  successTint: '#ECFDF5',

  warn: '#D97706',
  warnTint: '#FEF3C7',

  /** 토요일 글자 — 일요일(danger)과 짝을 이루는 파랑 */
  saturday: '#3B82F6',

  /** 강조 보라 — VVIP 뱃지 등 */
  accent: '#7C3AED',
  accentTint: '#EDE9FE',
} as const;

// ── 모서리 ───────────────────────────────────────────────────────────────────

export const r = {
  sm: 8,    // 작은 버튼, 뱃지
  md: 12,   // 입력창, 보통 버튼
  lg: 16,   // 카드
  xl: 20,   // 큰 카드, 모달
  full: 9999,
} as const;

// ── 간격 ─────────────────────────────────────────────────────────────────────

export const sp = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32,
} as const;

// ── 글자 ─────────────────────────────────────────────────────────────────────

export const fs = {
  '2xs': 11, // 달력 칸, 아주 작은 라벨
  xs: 12,    // 뱃지, 보조 설명
  sm: 13,    // 표 본문, 작은 버튼
  base: 14,  // 본문
  md: 15,    // 조금 큰 본문
  lg: 16,    // 소제목
  xl: 18,
  '2xl': 20, // 섹션 제목
  '3xl': 22, // 화면 제목
  '4xl': 28,
} as const;

export const fw = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

// ── 그림자 ───────────────────────────────────────────────────────────────────

export const shadow = {
  sm: '0 1px 3px rgba(0,0,0,0.06)',
  md: '0 1px 6px rgba(0,0,0,0.07)',
  lg: '0 8px 24px rgba(0,0,0,0.10)',
  modal: '0 20px 60px rgba(0,0,0,0.20)',
} as const;

// ── 읽기 쉬운 별칭 ───────────────────────────────────────────────────────────
//
// 화면 파일에는 이미 `c`, `r`, `fs` 같은 짧은 지역 변수가 쓰이고 있어서
// 짧은 이름을 그대로 가져오면 가려진다(shadowing). 화면에서는 아래 이름을 쓴다.

export { c as palette, r as radius, fs as font, fw as weight, sp as space };

// ── 바로 쓰는 조합 ───────────────────────────────────────────────────────────

/** 기본 카드 */
export const card: CSSProperties = {
  background: c.surface,
  border: `1px solid ${c.borderSubtle}`,
  borderRadius: r.lg,
  boxShadow: shadow.md,
  padding: '24px 28px',
};

/** 테두리만 있는 블록 — 카드 안에서 영역을 나눌 때 */
export const panel: CSSProperties = {
  background: c.surface,
  border: `1px solid ${c.border}`,
  borderRadius: r.md,
};

export const btnPrimary: CSSProperties = {
  padding: '10px 18px',
  background: c.primary,
  color: '#fff',
  border: 'none',
  borderRadius: r.sm,
  fontSize: fs.base,
  fontWeight: fw.semibold,
  cursor: 'pointer',
};

export const btnGhost: CSSProperties = {
  padding: '10px 18px',
  background: c.surface,
  color: '#374151',
  border: `1px solid ${c.border}`,
  borderRadius: r.sm,
  fontSize: fs.base,
  fontWeight: fw.semibold,
  cursor: 'pointer',
};

export const btnDanger: CSSProperties = {
  padding: '10px 18px',
  background: c.surface,
  color: c.danger,
  border: `1px solid ${c.dangerTint}`,
  borderRadius: r.sm,
  fontSize: fs.base,
  fontWeight: fw.semibold,
  cursor: 'pointer',
};

export const input: CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  background: c.surface,
  border: `1px solid ${c.border}`,
  borderRadius: r.md,
  fontSize: fs.base,
  color: c.text,
  outline: 'none',
};

/** 표 머리 */
export const th: CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: fs.xs,
  fontWeight: fw.semibold,
  color: c.textSub,
  borderBottom: `1px solid ${c.borderSubtle}`,
  whiteSpace: 'nowrap',
};

/** 표 본문 */
export const td: CSSProperties = {
  padding: '11px 14px',
  fontSize: fs.sm,
  color: '#374151',
  borderBottom: `1px solid ${c.surfaceSunken}`,
  whiteSpace: 'nowrap',
};

/** 알약 모양 뱃지 */
export const badge: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  borderRadius: r.full,
  fontSize: fs.xs,
  fontWeight: fw.semibold,
  whiteSpace: 'nowrap',
};

/** 섹션 제목 */
export const sectionTitle: CSSProperties = {
  fontSize: fs.lg,
  fontWeight: fw.bold,
  color: c.text,
  margin: `0 0 ${sp.xl}px`,
};
