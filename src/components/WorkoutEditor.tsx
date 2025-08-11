import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import type { SetRow, WorkoutRow } from '../types/db';
import PhotoUploader from './PhotoUploader';

type EditableSet = Omit<SetRow, 'id' | 'workout_id'> & { id?: string };

type Props = {
  userId: string;
  workout?: WorkoutRow | null;
  onSaved?: (workout: WorkoutRow) => void;
  onDeleted?: () => void;
};

function emptySet(index: number): EditableSet {
  return { exercise_name: '', rep_count: 8, weight: 0, set_index: index };
}

export default function WorkoutEditor({ userId, workout, onSaved, onDeleted }: Props) {
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [bodyPart, setBodyPart] = useState('가슴');
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState<EditableSet[]>([emptySet(0)]);
  const [saving, setSaving] = useState(false);
  const [copyPrevEnabled, setCopyPrevEnabled] = useState(true);
  const [bulkCount, setBulkCount] = useState(3);

  useEffect(() => {
    const load = async () => {
      if (!workout) return;
      setDate(workout.date);
      setBodyPart(workout.body_part);
      setNotes(workout.notes ?? '');
      const { data } = await supabase
        .from('sets')
        .select('*')
        .eq('workout_id', workout.id)
        .order('set_index');
      setSets((data as EditableSet[]) ?? []);
    };
    load();
  }, [workout]);

  function updateSet(i: number, patch: Partial<EditableSet>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function addSet() {
    setSets((prev) => {
      if (prev.length === 0 || !copyPrevEnabled) return [...prev, emptySet(prev.length)];
      const last = prev[prev.length - 1];
      const next: EditableSet = {
        exercise_name: last.exercise_name,
        rep_count: last.rep_count,
        weight: last.weight,
        set_index: prev.length,
      };
      return [...prev, next];
    });
  }

  function duplicateSetAt(index: number) {
    setSets((prev) => {
      const src = prev[index];
      const next: EditableSet = {
        exercise_name: src.exercise_name,
        rep_count: src.rep_count,
        weight: src.weight,
        set_index: prev.length,
      };
      return [...prev, next];
    });
  }

  function bulkAdd() {
    const count = Math.max(1, Math.min(20, Number(bulkCount) || 1));
    setSets((prev) => {
      let next = [...prev];
      for (let i = 0; i < count; i += 1) {
        if (next.length === 0 || !copyPrevEnabled) {
          next = [...next, emptySet(next.length)];
        } else {
          const last = next[next.length - 1];
          next = [
            ...next,
            {
              exercise_name: last.exercise_name,
              rep_count: last.rep_count,
              weight: last.weight,
              set_index: next.length,
            },
          ];
        }
      }
      return next;
    });
  }

  function removeSet(i: number) {
    setSets((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, set_index: idx })));
  }

  async function handleSave() {
    setSaving(true);
    try {
      let savedWorkout: WorkoutRow | null = null;
      if (!workout) {
        const { data, error } = await supabase
          .from('workouts')
          .insert({ user_id: userId, date, body_part: bodyPart, notes })
          .select()
          .single();
        if (error) throw error;
        savedWorkout = data as WorkoutRow;
      } else {
        const { data, error } = await supabase
          .from('workouts')
          .update({ date, body_part: bodyPart, notes })
          .eq('id', workout.id)
          .select()
          .single();
        if (error) throw error;
        savedWorkout = data as WorkoutRow;
        await supabase.from('sets').delete().eq('workout_id', workout.id);
      }

      if (!savedWorkout) throw new Error('Failed to save workout');

      const setsPayload = sets.map((s, idx) => ({
        workout_id: savedWorkout!.id,
        exercise_name: s.exercise_name,
        rep_count: Number(s.rep_count),
        weight: s.weight === null ? null : Number(s.weight),
        set_index: idx,
      }));
      if (setsPayload.length) {
        const { error: setsErr } = await supabase.from('sets').insert(setsPayload);
        if (setsErr) throw setsErr;
      }

      onSaved?.(savedWorkout);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!workout) return;
    const ok = confirm('정말 삭제하시겠어요?');
    if (!ok) return;
    const { error } = await supabase.from('workouts').delete().eq('id', workout.id);
    if (!error) onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <div className="text-sm text-gray-600">날짜</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600">부위</div>
          <select
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            {['가슴', '등', '다리', '이두', '삼두', '어깨'].map((bp) => (
              <option key={bp} value={bp}>{bp}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2 block">
          <div className="text-sm text-gray-600">메모</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            rows={3}
            placeholder="느낌이나 메모를 남겨주세요"
          />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="font-semibold">세트</div>
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={copyPrevEnabled} onChange={(e) => setCopyPrevEnabled(e.target.checked)} />
              <span>다음 세트에 이전 값 복사</span>
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={bulkCount}
              onChange={(e) => setBulkCount(Number(e.target.value))}
              className="w-16 rounded border px-2 py-1"
              title="일괄 추가 개수"
            />
            <button type="button" className="btn-outline" onClick={bulkAdd}>
              + 일괄 추가
            </button>
            <button type="button" className="btn-outline" onClick={addSet}>
              + 세트 추가
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {sets.map((s, i) => (
            <div key={i} className="relative card p-4">
              <div className="mb-2 text-xs text-gray-500">세트 {i + 1}</div>
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => duplicateSetAt(i)}
                  className="btn-outline px-2 py-1 text-xs"
                  title="이 세트를 복제해서 맨 뒤에 추가"
                >
                  복제
                </button>
                <button
                  type="button"
                  onClick={() => removeSet(i)}
                  className="btn-outline px-2 py-1 text-xs"
                  title="세트 삭제"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-6">
                  <label className="block text-sm text-gray-600">운동</label>
                  <input
                    type="text"
                    value={s.exercise_name}
                    onChange={(e) => updateSet(i, { exercise_name: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                    placeholder="예: 벤치프레스"
                    list="exercise-list"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm text-gray-600">횟수</label>
                  <input
                    type="number"
                    value={s.rep_count}
                    onChange={(e) => updateSet(i, { rep_count: Number(e.target.value) })}
                    className="mt-1 w-full rounded border px-3 py-2"
                    min={1}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm text-gray-600">무게 (kg)</label>
                  <input
                    type="number"
                    value={s.weight ?? 0}
                    onChange={(e) => updateSet(i, { weight: Number(e.target.value) })}
                    className="mt-1 w-full rounded border px-3 py-2"
                    min={0}
                    step="0.5"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <datalist id="exercise-list">
          {Array.from(new Set(sets.map((s) => s.exercise_name).filter(Boolean))).map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      {workout && (
        <div>
          <div className="mb-2 font-semibold">사진</div>
          <ExistingPhotos workoutId={workout.id} />
          <PhotoUploader workoutId={workout.id} userId={userId} onUploaded={() => onSaved?.(workout)} />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? '저장중...' : '저장'}
        </button>
        {workout && (
          <button type="button" onClick={handleDelete} className="rounded border px-4 py-2">
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

function ExistingPhotos({ workoutId }: { workoutId: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    supabase
      .from('photos')
      .select('public_url, storage_path')
      .eq('workout_id', workoutId)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const bucket = 'workout-photos';
        const resolved = await Promise.all(
          (data ?? []).map(async (p) => {
            if (p.public_url) return p.public_url as string;
            const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(p.storage_path as string, 60 * 60 * 24 * 7);
            return signed?.signedUrl ?? '';
          })
        );
        setUrls(resolved.filter(Boolean));
      });
  }, [workoutId]);
  if (!urls.length) return null;
  return (
    <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {urls.map((u, i) => (
        <div key={i} className="relative w-full overflow-hidden rounded-lg bg-black/5">
          <div className="aspect-[4/5] w-full">
            <img src={u} className="h-full w-full object-cover" />
          </div>
        </div>
      ))}
    </div>
  );
}


