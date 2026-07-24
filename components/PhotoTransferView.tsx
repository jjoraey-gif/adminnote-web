'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';

const BUCKET = 'photo-transfers';
const DAILY_SIZE_LIMIT_MB = 20;
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp'];

function isImage(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTS.includes(ext);
}

function fileEmoji(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return '📄';
  if (['doc', 'docx', 'hwp', 'hwpx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📑';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
  return '📎';
}

interface PhotoMeta {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  expires_at: string;
  created_at: string;
  signedUrl?: string;      // 다운로드용 풀사이즈
  thumbUrl?: string;       // 그리드 표시용 썸네일
}

function daysLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  const hours = Math.floor(diff / 3600000);
  if (hours <= 0) return '만료됨';
  if (hours < 24) return `${hours}시간 후 삭제`;
  return `${Math.floor(hours / 24)}일 후 삭제`;
}

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

async function getFreshSignedUrl(filePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 120);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'URL 생성 실패');
  return data.signedUrl;
}

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('파일 다운로드 실패');
  return res.blob();
}

// File System Access API 타입
declare global {
  interface Window {
    showSaveFilePicker?: (options?: object) => Promise<FileSystemFileHandle>;
    showDirectoryPicker?: (options?: object) => Promise<FileSystemDirectoryHandle>;
  }
}

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB per file
const DAILY_SIZE_LIMIT = 20 * 1024 * 1024; // 20MB per day

export default function PhotoTransferView({ userId }: { userId: string }) {
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaySizeMB, setTodaySizeMB] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [preview, setPreview] = useState<PhotoMeta | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    // 쿼리 1: 오늘 업로드 총량 (삭제 포함)
    const { data: todayData } = await supabase
      .from('photo_transfers')
      .select('file_size')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString());
    const todayBytes = (todayData ?? []).reduce((sum, p) => sum + (p.file_size ?? 0), 0);
    setTodaySizeMB(todayBytes / 1024 / 1024);

    // 쿼리 2: 화면 표시용 (삭제 안됐고 만료 안된 것만)
    const { data, error: dbErr } = await supabase
      .from('photo_transfers')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dbErr) {
      setError(`데이터 조회 실패: ${dbErr.message}`);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const valid = rows.filter(p => new Date(p.expires_at) > new Date());
    if (valid.length === 0) { setPhotos([]); setLoading(false); return; }

    // 풀사이즈 URL (다운로드용) — 배치로 한번에
    const { data: urls } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(valid.map(p => p.file_path), 7200);

    const urlMap: Record<string, string> = {};
    (urls ?? []).forEach(u => { if (u.signedUrl && u.path) urlMap[u.path] = u.signedUrl; });

    // 썸네일 URL (그리드 표시용) — 400px로 리사이즈해서 로딩 속도 향상
    const thumbResults = await Promise.all(
      valid.map(p =>
        supabase.storage.from(BUCKET).createSignedUrl(p.file_path, 7200, {
          transform: { width: 400, height: 400, resize: 'cover', quality: 70 },
        }).then(({ data }) => ({ path: p.file_path, url: data?.signedUrl ?? '' }))
      )
    );
    const thumbMap: Record<string, string> = {};
    thumbResults.forEach(t => { if (t.url) thumbMap[t.path] = t.url; });

    setPhotos(valid.map(p => ({
      ...p,
      signedUrl: urlMap[p.file_path],
      thumbUrl: thumbMap[p.file_path] || urlMap[p.file_path],
    })));
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // 웹 파일 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const todayUsedBytes = todaySizeMB * 1024 * 1024;
    const supabase = createClient();
    setUploading(true);
    let successCount = 0;
    const errors: string[] = [];
    let runningSize = todayUsedBytes;

    for (const file of files) {
      if (file.size > FILE_SIZE_LIMIT) {
        errors.push(`"${file.name}" 파일이 10MB를 초과합니다. (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
        continue;
      }
      if (runningSize + file.size > DAILY_SIZE_LIMIT) {
        errors.push(`오늘 용량 한도(20MB) 초과 — "${file.name}" 건너뜀`);
        continue;
      }

      setUploadProgress(`업로드 중... ${file.name}`);
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const randPart = Math.random().toString(36).slice(2, 6);
      const filePath = `${userId}/${datePart}_${timePart}_${randPart}.${ext}`;
      const uploadMime = IMAGE_EXTS.includes(ext) ? file.type : 'application/octet-stream';
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { contentType: uploadMime, upsert: false });
        if (upErr) throw upErr;

        const { error: dbErr } = await supabase.from('photo_transfers').insert({
          user_id: userId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          expires_at: expiresAt,
        });
        if (dbErr) throw dbErr;

        successCount++;
        runningSize += file.size;
      } catch (err: any) {
        errors.push(`"${file.name}": ${err.message}`);
      }
    }

    setUploading(false);
    setUploadProgress('');
    if (errors.length > 0) alert(`일부 실패:\n${errors.join('\n')}`);
    if (successCount > 0) await fetchPhotos();
  };

  // 개별 다운로드 — 저장 위치 지정
  const downloadPhoto = async (photo: PhotoMeta) => {
    setDownloading(photo.id);
    try {
      const url = await getFreshSignedUrl(photo.file_path);
      const blob = await fetchBlob(url);
      const ext = photo.file_name.split('.').pop() ?? 'jpg';
      const mimeType = blob.type || (ext === 'png' ? 'image/png' : 'application/octet-stream');

      if (window.showSaveFilePicker) {
        // File System Access API — 저장 위치 직접 지정
        const handle = await window.showSaveFilePicker({
          suggestedName: photo.file_name,
          types: [{ description: '이미지', accept: { [mimeType]: [`.${ext}`] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // 폴백: 브라우저 기본 다운로드 폴더
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl; a.download = photo.file_name;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') alert(`다운로드 실패: ${e.message}`);
    } finally {
      setDownloading(null);
    }
  };

  // 전체 다운로드 — 폴더 지정 후 일괄 저장
  const downloadAll = async () => {
    if (photos.length === 0) return;
    setDownloadingAll(true);
    setDownloadProgress('');
    try {
      if (window.showDirectoryPicker) {
        // File System Access API — 폴더 선택
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' } as object);
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          setDownloadProgress(`저장 중... (${i + 1}/${photos.length})`);
          try {
            const url = await getFreshSignedUrl(photo.file_path);
            const blob = await fetchBlob(url);
            const fileHandle = await dirHandle.getFileHandle(photo.file_name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          } catch {
            // 개별 실패는 스킵
          }
        }
        setDownloadProgress(`완료! ${photos.length}장 저장됨`);
        setTimeout(() => setDownloadProgress(''), 3000);
      } else {
        // 폴백: 순차 브라우저 다운로드
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          setDownloadProgress(`다운로드 중... (${i + 1}/${photos.length})`);
          await downloadPhoto(photo);
          await new Promise(r => setTimeout(r, 400));
        }
        setDownloadProgress('');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') alert(`전체 다운로드 실패: ${e.message}`);
      setDownloadProgress('');
    } finally {
      setDownloadingAll(false);
    }
  };

  const deleteAll = async () => {
    if (photos.length === 0) return;
    if (!confirm(`파일 ${photos.length}개를 모두 삭제하시겠습니까?`)) return;
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove(photos.map(p => p.file_path));
    await supabase.from('photo_transfers')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', photos.map(p => p.id));
    setPhotos([]);
    setPreview(null);
  };

  const deletePhoto = async (photo: PhotoMeta) => {
    if (!confirm(`"${photo.file_name}" 을 삭제하시겠습니까?`)) return;
    const supabase = createClient();
    // 스토리지 실제 삭제 (공간 확보)
    await supabase.storage.from(BUCKET).remove([photo.file_path]);
    // DB 소프트 삭제 (오늘 업로드 용량 추적 유지)
    await supabase.from('photo_transfers').update({ deleted_at: new Date().toISOString() }).eq('id', photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    if (preview?.id === photo.id) setPreview(null);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, color: '#9CA3AF' }}>불러오는 중...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 14, color: '#EF4444', marginBottom: 16 }}>{error}</div>
        <button onClick={fetchPhotos} style={{ padding: '8px 20px', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>다시 시도</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* 미리보기 모달 */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={preview.signedUrl}
            alt={preview.file_name}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '82vh',
              objectFit: 'contain', borderRadius: 8,
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              cursor: 'default',
            }}
          />
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#D1D5DB', fontSize: 13 }}>{preview.file_name} · {formatSize(preview.file_size)}</span>
            <button
              onClick={e => { e.stopPropagation(); downloadPhoto(preview); }}
              style={{ padding: '8px 20px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              ⬇ 다운로드
            </button>
            <button
              onClick={e => { e.stopPropagation(); deletePhoto(preview); }}
              style={{ padding: '8px 16px', background: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
            >
              🗑 삭제
            </button>
            <button
              onClick={() => setPreview(null)}
              style={{ padding: '8px 16px', background: 'transparent', color: '#9CA3AF', border: '1px solid #4B5563', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 안내 배너 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', margin: '0 auto 24px',
        background: '#EFF6FF', borderRadius: 12, border: '1px solid #BFDBFE',
        flexWrap: 'wrap', gap: 8, maxWidth: '90%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📱⇄💻</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>
              오늘 사용량 <span style={{ fontSize: 15 }}>{todaySizeMB.toFixed(1)}</span>/{DAILY_SIZE_LIMIT_MB}MB
            </div>
            <div style={{ fontSize: 11, color: '#3B82F6' }}>
              파일 추가 후 3일 보관 · 자동삭제
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(downloadProgress || uploadProgress) && (
            <span style={{ fontSize: 13, color: '#2563EB', fontWeight: 500 }}>{uploadProgress || downloadProgress}</span>
          )}
          <button onClick={fetchPhotos} style={btnStyle('#fff', '#E5E7EB', '#374151')}>새로고침</button>
          <button onClick={deleteAll} style={btnStyle('#fff', '#FEE2E2', '#EF4444')}>전체삭제</button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ ...btnStyle('#2563EB', '#2563EB', '#fff'), opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? '업로드 중...' : '+ 파일 추가'}
          </button>
          {photos.length > 0 && (
            <button
              onClick={downloadAll}
              disabled={downloadingAll}
              style={{ ...btnStyle('#1C1C1E', '#1C1C1E', '#fff'), opacity: downloadingAll ? 0.6 : 1 }}
            >
              {downloadingAll ? downloadProgress || '저장 중...' : `⬇ 전체 다운로드 (${photos.length}개)`}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9CA3AF' }}>
          <div style={{ fontSize: 40, marginBottom: 12, letterSpacing: 4 }}>🖼️📄</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>업로드 된 사진이나 파일이 없습니다</div>
          <div style={{ fontSize: 13, color: '#9CA3AF' }}>파일을 추가하면 앱에서 다운받을 수 있습니다</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {photos.map(photo => {
            const img = isImage(photo.file_name);
            return (
              <div key={photo.id} style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

                {/* 썸네일 or 파일 아이콘 */}
                <div
                  onClick={() => img && photo.signedUrl && setPreview(photo)}
                  style={{ width: '100%', paddingBottom: '100%', position: 'relative', background: '#F3F4F6', cursor: img && photo.signedUrl ? 'zoom-in' : 'default' }}
                >
                  {img && photo.thumbUrl ? (
                    <img
                      src={photo.thumbUrl}
                      alt={photo.file_name}
                      loading="lazy"
                      decoding="async"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ fontSize: 48 }}>{fileEmoji(photo.file_name)}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', letterSpacing: 1 }}>
                        {photo.file_name.split('.').pop()?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, color: '#374151', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {photo.file_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>
                    {formatSize(photo.file_size)} · <span style={{ color: '#EF4444' }}>{daysLeft(photo.expires_at)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => downloadPhoto(photo)}
                      disabled={downloading === photo.id}
                      style={{ flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 7, cursor: downloading === photo.id ? 'default' : 'pointer', opacity: downloading === photo.id ? 0.6 : 1 }}
                    >
                      {downloading === photo.id ? '저장 중...' : '⬇ 저장'}
                    </button>
                    <button
                      onClick={() => deletePhoto(photo)}
                      style={{ padding: '7px 10px', fontSize: 12, background: '#fff', color: '#EF4444', border: '1px solid #FEE2E2', borderRadius: 7, cursor: 'pointer' }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string, border: string, color: string): React.CSSProperties {
  return { padding: '8px 16px', fontSize: 13, fontWeight: 500, background: bg, color, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer' };
}
