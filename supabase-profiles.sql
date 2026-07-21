-- profiles 테이블 생성
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL DEFAULT 'personal', -- 'personal' | 'shared'
  nickname TEXT,
  org_name TEXT,       -- 공용폰 전용
  user_id TEXT,        -- 공용폰 전용
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- 소프트 딜리트 (회원탈퇴)
);

-- org_name + user_id 조합 유니크 (공용폰 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_shared_unique
  ON profiles (org_name, user_id)
  WHERE account_type = 'shared';

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필만 조회 가능
CREATE POLICY "본인 프로필 조회" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 본인 프로필만 수정 가능
CREATE POLICY "본인 프로필 수정" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 가입 시 프로필 생성 허용
CREATE POLICY "프로필 생성" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 공용폰 로그인용: org_name + user_id로 이메일 조회 (서버 전용)
-- 이 함수는 service_role key로만 호출 가능
CREATE OR REPLACE FUNCTION get_email_by_shared_account(p_org_name TEXT, p_user_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT au.email INTO v_email
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE p.org_name = p_org_name
    AND p.user_id = p_user_id
    AND p.account_type = 'shared'
    AND p.deleted_at IS NULL;
  RETURN v_email;
END;
$$;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
