import { useRef, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

type DailyPhotoUploaderProps = {
  date: string; // yyyy-MM-dd
  userId: string;
  targetUserId?: string; // 친구의 userId (없으면 자신)
  onUploaded?: () => void;
};

async function fileToOptimizedBlob(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const maxWidth = 800;
      const maxHeight = 600;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function DailyPhotoUploader({ date, userId, targetUserId, onUploaded }: DailyPhotoUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  async function handleUpload() {
    if (!files.length) return;
    setUploading(true);
    try {
      const bucket = 'workout-photos';
      const actualTargetUserId = targetUserId || userId; // 친구에게 업로드하거나 자신에게 업로드
      
      for (const file of files) {
        const optimized = await fileToOptimizedBlob(file);
        const ext = 'jpg';
        const path = `${actualTargetUserId}/daily/${date}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, optimized, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
        const publicUrl = signed?.signedUrl ?? null;
        const { error: dbErr } = await supabase.from('photos').insert({
          date: date,
          user_id: actualTargetUserId,
          storage_path: path,
          public_url: publicUrl,
          workout_id: null, // 일별 사진이므로 null
        });
        if (dbErr) throw dbErr;
      }
      setFiles([]);
      if (onUploaded) onUploaded();
    } catch (e) {
      alert(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2 card p-3 bg-orange-50 border-orange-200">
      <div className="text-sm font-semibold text-orange-800">
        📸 하루 대표 사진 {targetUserId && targetUserId !== userId && '(친구에게 추가)'}
      </div>
      
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const newFiles = Array.from(e.target.files ?? []);
          setFiles((prev) => [...prev, ...newFiles]);
        }}
      />
      
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {previews.map((url, i) => (
            <div key={i} className="relative">
              <div className="w-full h-32 rounded overflow-hidden bg-gray-100">
                <img src={url} alt={`preview ${i}`} className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setFiles((prev) => prev.filter((_, idx) => idx !== i));
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-outline text-sm"
        >
          📷 사진 선택
        </button>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!files.length || uploading}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {uploading ? '업로드 중...' : '업로드'}
        </button>
      </div>
    </div>
  );
}
