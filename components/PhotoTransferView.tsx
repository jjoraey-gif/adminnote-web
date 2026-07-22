'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

const BUCKET = 'photo-transfers';
const DAILY_LIMIT = 20;

interface PhotoMeta {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  expires_at: string;
  created_at: string;
  signedUrl?: string;
}

function daysLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  const hours = Math.floor(diff / 3600000);
  if (hours <= 0) return '만료됨';
  if (hours < 24) return `${hours}시간 후 삭제`;
  return `${Math.floor(hours / 24)}일 후 삭제`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function PhotoTransferView({ userId }: { userId: string }) {
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('photo_transfers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) { setLoading(false); return; }

    const todayUploads = data.filter(p => new Date(p.created_at) >= todayStart).length;
    setTodayCount(todayUploads);

    const valid = data.filter(p => new Date(p.expires_at) > new Date());

    if (valid.length > 0) {
      const { data: urls } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(valid.map(p => p.file_path), 3600);

      const urlMap: Record<string, string> = {};
      urls?.forEach(u => { if (u.signedUrl) urlMap[u.path] = u.signedUrl; });
      setPhotos(valid.map(p => ({ ...p, signedUrl: urlMap[p.file_path] })));
    } else {
      setPhotos([]);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const downloadPhoto = async (photo: PhotoMeta) => {
    if (!photo.signedUrl) return;
    setDownloading(photo.id);
    try {
      const response = await fetch(photo.signedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('다운로드에 실패했습니다.');
    } finally {
      setDownloading(null);
    }
  };

  const downloadAll = async () => {
    for (const photo of photos) {
      await downloadPhoto(photo);
      await new Promise(r => setTimeout(r, 300));
    }
  };

  const deletePhoto = async (photo: PhotoMeta) => {
    if (!confirm(`"${photo.file_name}" 을 삭제하시겠습니까?`)) return;
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([photo.file_path]);
    await supabase.from('photo_transfers').delete().eq('id', photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, color: '#9CA3AF', fontSize: 14 }}>
        불러오는 중...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* 안내 배너 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', marginBottom: 24,
        background: '#EFF6FF', borderRadius: 14, border: '1px solid #BFDBFE',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>📱→💻</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1D4ED8' }}>앱에서 전송한 사진</div>
            <div style={{ fontSize: 12, color: '#3B82F6' }}>
              오늘 {todayCount}/{DAILY_LIMIT}장 · 업로드 후 3일간 보관 후 자동삭제
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchPhotos} style={btnStyle('#fff', '#E5E7EB', '#374151')}>
            새로고침
          </button>
          {photos.length > 0 && (
            <button onClick={downloadAll} style={btnStyle('#2563EB', '#2563EB', '#fff')}>
              전체 다운로드 ({photos.length}장)
            </button>
          )}
        </div>
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9CA3AF' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>전송된 사진이 없습니다</div>
          <div style={{ fontSize: 14 }}>앱의 더보기 → 사진전송에서 사진을 업로드하세요</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}>
          {photos.map(photo => (
            <div key={photo.id} style={{
              border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden',
              background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              {/* 썸네일 */}
              <div style={{ width: '100%', paddingBottom: '100%', position: 'relative', background: '#F9FAFB' }}>
                {photo.signedUrl ? (
                  <img
                    src={photo.signedUrl}
                    alt={photo.file_name}
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#D1D5DB', fontSize: 32,
                  }}>🖼️</div>
                )}
              </div>

              {/* 정보 */}
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 12, color: '#374151', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {photo.file_name}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>
                  {formatSize(photo.file_size ?? 0)} · <span style={{ color: '#EF4444' }}>{daysLeft(photo.expires_at)}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => downloadPhoto(photo)}
                    disabled={downloading === photo.id}
                    style={{
                      flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
                      background: '#2563EB', color: '#fff',
                      border: 'none', borderRadius: 7, cursor: 'pointer',
                      opacity: downloading === photo.id ? 0.6 : 1,
                    }}
                  >
                    {downloading === photo.id ? '...' : '⬇ 다운로드'}
                  </button>
                  <button
                    onClick={() => deletePhoto(photo)}
                    style={{
                      padding: '7px 10px', fontSize: 12,
                      background: '#fff', color: '#EF4444',
                      border: '1px solid #FEE2E2', borderRadius: 7, cursor: 'pointer',
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string, border: string, color: string): React.CSSProperties {
  return {
    padding: '8px 16px', fontSize: 13, fontWeight: 500,
    background: bg, color, border: `1px solid ${border}`,
    borderRadius: 8, cursor: 'pointer',
  };
}
