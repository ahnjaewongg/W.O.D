import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import type { PhotoRow, SetRow, WorkoutRow } from '../types/db';

type WorkoutWithPhotos = WorkoutRow & { photos: PhotoRow[]; sets: SetRow[] };

type Props = {
  userId: string;
  filterBodyPart?: string;
  filterDate?: string; // yyyy-MM-dd
  refreshKey?: number;
  onSelect?: (workout: WorkoutWithPhotos) => void;
};

export default function WorkoutList({ userId, filterBodyPart, filterDate, refreshKey, onSelect }: Props) {
  const [workouts, setWorkouts] = useState<WorkoutWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const q = supabase
        .from('workouts')
        .select('*, photos:photos(*), sets:sets(*)')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      const query = (() => {
        let cur = q;
        if (filterBodyPart) cur = cur.eq('body_part', filterBodyPart);
        if (filterDate) cur = cur.eq('date', filterDate);
        return cur;
      })();
      const { data, error } = await query.returns<WorkoutWithPhotos[]>();
      if (!error && data) setWorkouts(data);
      setLoading(false);
    };
    load();
  }, [userId, filterBodyPart, filterDate, refreshKey]);

  const grouped = useMemo(() => {
    const byDate = new Map<string, WorkoutWithPhotos[]>();
    for (const w of workouts) {
      const key = w.date;
      const arr = byDate.get(key) ?? [];
      arr.push(w);
      byDate.set(key, arr);
    }
    return Array.from(byDate.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [workouts]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {grouped.map(([date, items]) => (
        <div key={date} className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-semibold text-gray-700">
            {format(parseISO(date), 'EEE, MMM d, yyyy')}
          </div>
          <div className="space-y-2">
            {items.map((w) => (
              <div
                key={w.id}
                className="flex cursor-pointer items-center justify-between rounded border p-3 hover:bg-gray-50 bg-white/70 backdrop-blur"
                onClick={() => onSelect?.(w)}
              >
                <div>
                  <div className="font-semibold">{w.body_part}</div>
                  <div className="mt-1 text-sm text-gray-700">
                    {renderSummary(w.sets)}
                  </div>
                  {w.notes && <div className="truncate text-sm text-gray-500">{w.notes}</div>}
                </div>
                {w.photos?.[0] && (
                  <img
                    src={w.photos[0].public_url ?? ''}
                    alt="thumb"
                    className="h-16 w-16 rounded object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {grouped.length === 0 && <div className="text-gray-500">운동 기록이 없습니다.</div>}
    </div>
  );
}

function renderSummary(sets: SetRow[] | undefined) {
  if (!sets || sets.length === 0) return '세트를 추가하세요';
  const byExercise = new Map<string, SetRow[]>();
  for (const s of sets) {
    const arr = byExercise.get(s.exercise_name) ?? [];
    arr.push(s);
    byExercise.set(s.exercise_name, arr);
  }
  const lines: string[] = [];
  for (const [name, arr] of byExercise.entries()) {
    const repsMode = mode(arr.map((x) => x.rep_count));
    const weightVals = arr.map((x) => x.weight ?? 0).filter((n) => !Number.isNaN(n));
    const weightMode = weightVals.length ? mode(weightVals) : 0;
    lines.push(`${name} ${repsMode}회(${weightMode}kg) × ${arr.length}세트`);
  }
  const shown = lines.slice(0, 2).join(' · ');
  const more = lines.length > 2 ? ` · +${lines.length - 2}개 운동` : '';
  return shown + more;
}

function mode(values: number[]) {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0] ?? 0;
  let bestCount = -1;
  for (const [v, c] of counts.entries()) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}


