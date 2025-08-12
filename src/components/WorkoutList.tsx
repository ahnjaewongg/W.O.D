import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import type { PhotoRow, ExerciseWithSets, WorkoutRow } from '../types/db';
import DailyPhotoUploader from './DailyPhotoUploader';
import ImageSlider from './ImageSlider';

type WorkoutWithPhotos = WorkoutRow & { 
  photos: PhotoRow[]; 
  exercises: ExerciseWithSets[];
};

type Props = {
  userId: string;
  filterBodyPart?: string;
  filterDate?: string; // yyyy-MM-dd
  refreshKey?: number;
  onSelect?: (workout: WorkoutWithPhotos) => void;
  onCopyWorkout?: (workout: WorkoutWithPhotos) => void;
  onCopyDay?: (date: string, workouts: WorkoutWithPhotos[]) => void;
};

export default function WorkoutList({ userId, filterBodyPart, filterDate, refreshKey, onSelect, onCopyWorkout, onCopyDay }: Props) {
  const [workouts, setWorkouts] = useState<WorkoutWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyPhotos, setDailyPhotos] = useState<Map<string, PhotoRow[]>>(new Map());
  const [showDailyUploader, setShowDailyUploader] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const q = supabase
        .from('workouts')
        .select(`
          *, 
          photos:photos!workout_id(*),
          exercises:exercises(
            *,
            sets:sets(*)
          )
        `)
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

  // 일별 사진 로드 (그룹 멤버들 모두)
  useEffect(() => {
    const loadDailyPhotos = async () => {
      const { data } = await supabase
        .from('photos')
        .select('*, users:user_id(display_name, email)')
        .is('workout_id', null)
        .not('date', 'is', null)
        .order('created_at', { ascending: false });
      
      if (data) {
        const photosByDate = new Map<string, PhotoRow[]>();
        for (const photo of data) {
          const date = photo.date!;
          const existing = photosByDate.get(date) || [];
          existing.push(photo);
          photosByDate.set(date, existing);
        }
        setDailyPhotos(photosByDate);
      }
    };
    loadDailyPhotos();
  }, [userId, refreshKey]);

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
      {grouped.map(([date, items]) => {
        const dayPhotos = dailyPhotos.get(date) || [];
        const primaryPhoto = dayPhotos[0];
        
        return (
          <div key={date} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-gray-700">
                  {format(parseISO(date), 'EEE, MMM d, yyyy')}
                </div>
                {primaryPhoto && (
                  <img 
                    src={primaryPhoto.public_url || ''} 
                    alt="Day highlight" 
                    className="w-8 h-8 rounded-full object-cover border-2 border-orange-300"
                    title="오늘의 대표 사진"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDailyUploader(showDailyUploader === date ? null : date)}
                  className="btn-outline px-2 py-1 text-xs"
                  title="하루 대표 사진 업로드"
                >
                  📸 사진
                </button>
                {onCopyDay && items.length > 1 && (
                  <button
                    onClick={() => onCopyDay(date, items)}
                    className="btn-outline px-2 py-1 text-xs"
                    title="이 날의 모든 운동을 오늘로 복사"
                  >
                    📅 하루 전체 복사
                  </button>
                )}
              </div>
            </div>
            
            {/* 일별 사진 업로더 */}
            {showDailyUploader === date && (
              <div className="mb-3">
                <DailyPhotoUploader 
                  date={date} 
                  userId={userId} 
                  onUploaded={() => {
                    setShowDailyUploader(null);
                    // 일별 사진 다시 로드
                    const loadDailyPhotos = async () => {
                      const { data } = await supabase
                        .from('photos')
                        .select('*')
                        .is('workout_id', null)
                        .not('date', 'is', null)
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false });
                      
                      if (data) {
                        const photosByDate = new Map<string, PhotoRow[]>();
                        for (const photo of data) {
                          const date = photo.date!;
                          const existing = photosByDate.get(date) || [];
                          existing.push(photo);
                          photosByDate.set(date, existing);
                        }
                        setDailyPhotos(photosByDate);
                      }
                    };
                    loadDailyPhotos();
                  }} 
                />
              </div>
            )}
            
            {/* 일별 사진 슬라이더 */}
            {dayPhotos.length > 0 && (
              <div className="mb-3">
                <ImageSlider photos={dayPhotos} className="max-w-sm mx-auto" />
                {dayPhotos.length > 1 && (
                  <div className="text-center text-xs text-gray-500 mt-1">
                    친구들과 함께한 추억 {dayPhotos.length}장
                  </div>
                )}
              </div>
            )}
            
            {/* 운동 목록 */}
            <div className="space-y-2">
              {items.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded border p-3 hover:bg-gray-50 bg-white/70 backdrop-blur workout-item"
                >
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => onSelect?.(w)}
                  >
                    <div className="font-semibold">{w.body_part}</div>
                    <div className="mt-1 text-sm text-gray-700">
                      {renderSummary(w.exercises)}
                    </div>
                    {w.notes && <div className="truncate text-sm text-gray-500">{w.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {onCopyWorkout && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyWorkout(w);
                        }}
                        className="btn-outline px-2 py-1 text-xs"
                        title="이 운동을 오늘 날짜로 복사"
                      >
                        📋 복사
                      </button>
                    )}
                    {w.photos?.[0] && (
                      <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={w.photos[0].public_url ?? ''}
                          alt="thumb"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {grouped.length === 0 && <div className="text-gray-500">운동 기록이 없습니다.</div>}
    </div>
  );
}

function renderSummary(exercises: ExerciseWithSets[] | undefined) {
  if (!exercises || exercises.length === 0) return '운동을 추가하세요';
  
  const lines: string[] = [];
  for (const exercise of exercises) {
    if (!exercise.sets || exercise.sets.length === 0) continue;
    
    const repsMode = mode(exercise.sets.map((x) => x.rep_count));
    const weightVals = exercise.sets.map((x) => x.weight ?? 0).filter((n) => !Number.isNaN(n));
    const weightMode = weightVals.length ? mode(weightVals) : 0;
    lines.push(`${exercise.exercise_name} ${repsMode}회(${weightMode}kg) × ${exercise.sets.length}세트`);
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