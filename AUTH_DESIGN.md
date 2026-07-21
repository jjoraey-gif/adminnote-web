# AdminNote 웹 - 회원가입 및 로그인 설계

## 1. 계정 유형

| 구분 | 개인 | 공용폰 |
|------|------|--------|
| 대상 | 개인 공무원 | 부서 공용 기기 |
| 로그인 | 이메일 + 비밀번호 | 기관이름 + 아이디 + 비밀번호 |
| 이메일 인증 | 필수 | 필수 (인증용, 로그인엔 미사용) |

---

## 2. 회원가입 필드

### 개인
- 닉네임 (선택)
- 이메일
- 비밀번호 (6자 이상)
- 비밀번호 확인
- □ 이용약관 동의 (필수)
- □ 개인정보처리방침 동의 (필수)

### 공용폰
- 기관이름
- 아이디
- 이메일 (인증용)
- 비밀번호 (6자 이상)
- 비밀번호 확인
- □ 이용약관 동의 (필수)
- □ 개인정보처리방침 동의 (필수)

---

## 3. 로그인 필드

### 개인
- 이메일
- 비밀번호

### 공용폰
- 기관이름
- 아이디
- 비밀번호

---

## 4. 내부 동작

### 개인 가입/로그인
- Supabase 이메일 = 입력한 이메일
- 가입 후 인증 메일 발송 → 인증 완료 후 로그인 가능

### 공용폰 가입
1. 실제 이메일로 Supabase 가입 → 인증 메일 발송
2. `profiles` 테이블에 `{ org_name, user_id, supabase_uid }` 저장
3. 인증 완료 후 로그인 가능

### 공용폰 로그인
1. 기관이름 + 아이디 입력
2. Next.js API(`/api/auth/shared-login`)에서 `profiles` 테이블 조회
3. 매핑된 이메일로 Supabase signInWithPassword 처리

---

## 5. DB 구조

### Supabase Auth (자동 관리)
- id, email, password_hash, email_verified, created_at 등

### profiles 테이블 (커스텀)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL DEFAULT 'personal', -- 'personal' | 'shared'
  nickname TEXT,
  org_name TEXT,      -- 공용폰만
  user_id TEXT,       -- 공용폰만
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- 회원탈퇴 소프트 딜리트
);
```

---

## 6. 보안 / 법적 사항

- 비밀번호: Supabase가 bcrypt 자동 처리
- 토큰: JWT + Refresh Token (Supabase 자동)
- HTTPS: Vercel 자동 적용
- 개인정보처리방침 페이지: `/privacy` 존재
- 이용약관 페이지: `/terms` 존재
- 회원탈퇴: 미구현 (추후 추가)

---

## 7. 구현 순서

- [ ] Supabase SQL - `profiles` 테이블 생성
- [ ] Next.js API - `/api/auth/shared-login` 라우트
- [ ] RootPage.tsx - 회원가입 폼 업데이트 (닉네임, 약관 동의, 공용폰 이메일 추가)
- [ ] RootPage.tsx - 로그인 폼 업데이트 (공용폰 API 연동)
- [ ] 이메일 인증 안내 화면
- [ ] git push → Vercel 배포

---

## 8. 소셜 로그인 (비활성화 상태 보존)

코드는 `SocialLogin` 컴포넌트에 보존됨.  
재활성화 시 `AuthPage`에서 `<SocialLogin />` 주석 해제.  
지원 프로바이더: Google, Kakao, Apple
