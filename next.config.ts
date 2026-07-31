import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['xxtjecsncjqffgocgcmk.supabase.co'],
  },
  // sharp는 네이티브 바이너리를 포함하므로 서버리스 번들링에서 제외하고
  // 실제 파일시스템에서 그대로 로드하도록 지정해야 한다.
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
