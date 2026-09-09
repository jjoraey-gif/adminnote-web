'use client';

// 비밀번호 재설정 페이지
// 메일의 재설정 링크 → /auth/callback (코드 교환) → 이 페이지로 이동한다.
// 이 시점에는 recovery 세션이 열려 있어 updateUser로 새 비밀번호를 설정할 수 있다.

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

// 콜백 라우트가 실패 원인을 ?error= 로 넘겨준다
const ERROR_MESSAGES: Record<string, string> = {
  other_browser:
    '재설정을 요청한 기기·브라우저와 다른 곳에서 링크를 열면 보안상 인증이 되지 않습니다. 링크를 요청했던 그 브라우저에서 다시 열어보시거나, 이 기기에서 재설정 메일을 새로 요청해주세요.',
  link_expired:
    '링크가 만료되었거나 이미 사용되었습니다. 재설정 메일을 새로 요청해주세요.',
  no_token:
    '링크 정보가 올바르지 않습니다. 메일에 있는 링크를 그대로 눌러주세요.',
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');
  const [phase, setPhase] = useState<Phase>(errorCode ? 'invalid' : 'checking');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 링크로 들어왔을 때 재설정 가능한 세션이 있는지 확인
  useEffect(() => {
    if (errorCode) return; // 콜백에서 이미 실패 원인을 받았으면 세션 확인 불필요
    const supabase = createClient();
    let settled = false;

    // 해시(#access_token=...) 형태의 링크는 클라이언트에서 세션이 잡히는 데 시간이 걸리므로
    // onAuthStateChange도 함께 구독한다.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !settled) {
        settled = true;
        setPhase('ready');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (settled) return;
      if (session) {
        settled = true;
        setPhase('ready');
      } else {
        // 해시 처리를 기다렸다가 그래도 없으면 만료/무효 링크로 간주
        setTimeout(() => {
          if (!settled) {
            settled = true;
            setPhase('invalid');
          }
        }, 1500);
      }
    });

    return () => subscription.unsubscribe();
  }, [errorCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('비밀번호는 6자 이상으로 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });

    if (updateErr) {
      console.error('[reset] 비밀번호 변경 실패:', updateErr.status, updateErr.message);
      if (updateErr.message.includes('should be different')) {
        setError('기존과 다른 비밀번호를 입력해주세요.');
      } else {
        setError('비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있으니 다시 시도해주세요.');
      }
      setLoading(false);
      return;
    }

    setPhase('done');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold">
            <span className="text-blue-600">공무원</span>
            <span className="text-gray-900"> 업무수첩</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          {phase === 'checking' && (
            <p className="text-center text-sm text-gray-500 py-6">확인 중입니다...</p>
          )}

          {phase === 'invalid' && (
            <div className="text-center py-2">
              <div className="text-4xl mb-3">⚠️</div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">
                {errorCode === 'other_browser' ? '다른 브라우저에서 열렸습니다' : '링크를 사용할 수 없습니다'}
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                {(errorCode && ERROR_MESSAGES[errorCode]) ??
                  '비밀번호 재설정 링크가 만료되었거나 이미 사용되었습니다. 로그인 화면에서 재설정 메일을 다시 요청해주세요.'}
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                로그인 화면으로
              </button>
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center py-2">
              <div className="text-4xl mb-3">✅</div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">비밀번호가 변경되었습니다</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                새 비밀번호로 로그인해주세요.<br />
                앱에서도 다시 로그인해야 할 수 있습니다.
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                로그인하러 가기
              </button>
            </div>
          )}

          {phase === 'ready' && (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">새 비밀번호 설정</h1>
              <p className="text-sm text-gray-500 mb-6">사용하실 새 비밀번호를 입력해주세요.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">새 비밀번호</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6자 이상"
                      required
                      autoComplete="new-password"
                      className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">새 비밀번호 확인</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="비밀번호를 다시 입력하세요"
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? '변경 중...' : '비밀번호 변경'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
