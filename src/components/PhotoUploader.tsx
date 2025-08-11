import { useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type PhotoUploaderProps = {
  workoutId: string;
  userId: string;
  onUploaded?: () => void;
};

async function fileToOptimizedBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const canvas = document.createElement('canvas');
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82)
  );
  return blob ?? file;
}

export default function PhotoUploader({ workoutId, userId, onUploaded }: PhotoUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  async function handleUpload() {
    if (!files.length) return;
    setUploading(true);
    try {
      const bucket = 'workout-photos';
      for (const file of files) {
        const optimized = await fileToOptimizedBlob(file);
        const ext = 'jpg';
        const path = `${userId}/${workoutId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, optimized, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
        const publicUrl = signed?.signedUrl ?? null;
        const { error: dbErr } = await supabase.from('photos').insert({
          workout_id: workoutId,
          user_id: userId,
          storage_path: path,
          public_url: publicUrl,
        });
        if (dbErr) throw dbErr;
      }
      setFiles([]);
      if (onUploaded) onUploaded();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2 card p-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700 hover:file:bg-blue-100"
      />
      {previews.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {previews.map((src, idx) => (
            <div key={idx} className="relative w-full overflow-hidden rounded-lg bg-black/5">
              <div className="aspect-[4/5] w-full">
                <img src={src} alt="preview" className="h-full w-full object-cover" />
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        className="btn-primary"
      >
        {uploading ? '업로드중...' : '사진 업로드'}
      </button>
    </div>
  );
}


