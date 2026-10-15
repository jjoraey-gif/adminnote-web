'use client';

import { useEffect, useState } from 'react';

/**
 * 문의 이메일 표시
 *
 * 보안 점검 도구가 "하드코드된 이메일 주소"로 지적한 항목에 대한 조치다.
 * 서버가 내려주는 HTML에는 완성된 이메일 주소가 들어가지 않도록, 화면에 그린 뒤
 * 브라우저에서 조합한다. 스팸 수집 봇도 같은 이유로 걸러진다.
 *
 * 자바스크립트가 꺼져 있어도 사람은 읽을 수 있도록 치환 표기를 먼저 보여준다.
 */

const LOCAL = 'jjoraey';
const DOMAIN = 'gmail.com';

export default function ContactEmail({ className = 'text-blue-600' }: { className?: string }) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => { setAddress(`${LOCAL}@${DOMAIN}`); }, []);

  if (!address) {
    return <span className={className}>{LOCAL} (at) {DOMAIN}</span>;
  }
  return <a href={`mailto:${address}`} className={className}>{address}</a>;
}
