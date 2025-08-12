import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import type { WorkoutRow, ExerciseWithSets } from '../types/db';
import WorkoutList from '../components/WorkoutList';
import NewWorkoutEditor from '../components/NewWorkoutEditor';

export default function IndexPage() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutRow | null>(null);
  const [filterBodyPart, setFilterBodyPart] = useState<string | undefined>(undefined);
  const [filterDate, setFilterDate] = useState<string | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user?.id ?? null);
      if (!session?.user) navigate('/login');
    });
    supabase.auth.getSession().then(({ data }) => {
      setSessionUserId(data.session?.user?.id ?? null);
      if (!data.session?.user) navigate('/login');
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const [datesWithWorkouts, setDatesWithWorkouts] = useState<string[]>([]);
  useEffect(() => {
    if (!sessionUserId) return;
    supabase
      .from('workouts')
      .select('date')
      .then(({ data }) => setDatesWithWorkouts((data ?? []).map((d) => d.date)));
  }, [sessionUserId, selectedWorkout, refreshKey]);

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth));
    const end = endOfWeek(endOfMonth(calendarMonth));
    const days: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    return days;
  }, [calendarMonth]);

  // 운동 복사 함수
  const handleCopyWorkout = async (sourceWorkout: WorkoutRow & { exercises: ExerciseWithSets[] }) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // 1. 새로운 운동 생성 (오늘 날짜로)
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: sessionUserId,
          date: today,
          body_part: sourceWorkout.body_part
        })
        .select()
        .single();
      
      if (workoutError) throw workoutError;
      
      // 2. 기존 운동들과 세트들 복사
      if (sourceWorkout.exercises && sourceWorkout.exercises.length > 0) {
        for (const sourceExercise of sourceWorkout.exercises) {
          // 운동 복사
          const { data: newExercise, error: exerciseError } = await supabase
            .from('exercises')
            .insert({
              workout_id: newWorkout.id,
              exercise_name: sourceExercise.exercise_name,
              exercise_index: sourceExercise.exercise_index,
              notes: sourceExercise.notes
            })
            .select()
            .single();
          
          if (exerciseError) throw exerciseError;
          
          // 세트들 복사
          if (sourceExercise.sets && sourceExercise.sets.length > 0) {
            const newSets = sourceExercise.sets.map((set, index) => ({
              exercise_id: newExercise.id,
              rep_count: set.rep_count,
              weight: set.weight,
              set_index: index + 1,
              notes: set.notes
            }));
            
            const { error: setsError } = await supabase
              .from('sets')
              .insert(newSets);
            
            if (setsError) throw setsError;
          }
        }
      }
      
      // 성공 메시지
      alert(`운동이 오늘(${today})로 성공적으로 복사되었습니다!`);
      setRefreshKey(k => k + 1);
      
    } catch (error) {
      console.error('운동 복사 실패:', error);
      alert(`운동 복사에 실패했습니다: ${(error as Error).message}`);
    }
  };

  // 하루 전체 복사 함수
  const handleCopyDay = async (sourceDate: string, sourceWorkouts: (WorkoutRow & { exercises: ExerciseWithSets[] })[]) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      if (sourceDate === today) {
        alert('같은 날짜로는 복사할 수 없습니다.');
        return;
      }
      
      // 복사 확인
      const confirmed = confirm(`${sourceDate}의 모든 운동(${sourceWorkouts.length}개)을 오늘(${today})로 복사하시겠습니까?`);
      if (!confirmed) return;
      
      // 각 운동을 순차적으로 복사
      for (const sourceWorkout of sourceWorkouts) {
        // 1. 새로운 운동 생성
        const { data: newWorkout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            user_id: sessionUserId,
            date: today,
            body_part: sourceWorkout.body_part,
            notes: sourceWorkout.notes
          })
          .select()
          .single();
        
        if (workoutError) throw workoutError;
        
        // 2. 기존 운동들과 세트들 복사
        if (sourceWorkout.exercises && sourceWorkout.exercises.length > 0) {
          for (const sourceExercise of sourceWorkout.exercises) {
            // 운동 복사
            const { data: newExercise, error: exerciseError } = await supabase
              .from('exercises')
              .insert({
                workout_id: newWorkout.id,
                exercise_name: sourceExercise.exercise_name,
                exercise_index: sourceExercise.exercise_index,
                notes: sourceExercise.notes
              })
              .select()
              .single();
            
            if (exerciseError) throw exerciseError;
            
            // 세트들 복사
            if (sourceExercise.sets && sourceExercise.sets.length > 0) {
              const newSets = sourceExercise.sets.map((set, index) => ({
                exercise_id: newExercise.id,
                rep_count: set.rep_count,
                weight: set.weight,
                set_index: index + 1,
                notes: set.notes
              }));
              
              const { error: setsError } = await supabase
                .from('sets')
                .insert(newSets);
              
              if (setsError) throw setsError;
            }
          }
        }
      }
      
      // 성공 메시지
      alert(`${sourceDate}의 모든 운동이 오늘(${today})로 성공적으로 복사되었습니다!`);
      setRefreshKey(k => k + 1);
      
    } catch (error) {
      console.error('하루 전체 복사 실패:', error);
      alert(`하루 전체 복사에 실패했습니다: ${(error as Error).message}`);
    }
  };

  if (!sessionUserId) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <header className="flex items-center justify-between">
        <div className="text-xl font-semibold workout-character friends-trio">운동 기록</div>
        <nav className="flex items-center gap-3">
          <Link to="/profile" className="text-orange-600 hover:underline">
            프로필
          </Link>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="btn-outline"
          >
            로그아웃
          </button>
        </nav>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="card flex items-center gap-2 p-3">
            <select
              value={filterBodyPart ?? ''}
              onChange={(e) => setFilterBodyPart(e.target.value || undefined)}
              className="rounded border px-3 py-2"
            >
              <option value="">전체 부위 선택</option>
              {['가슴', '등', '다리', '이두', '삼두', '어깨'].map((bp) => (
                <option key={bp} value={bp}>
                  {bp}
                </option>
              ))}
            </select>
            <button
              className="btn-primary bg-green-600 hover:bg-green-700"
              onClick={() => setSelectedWorkout({
                id: '',
                user_id: sessionUserId,
                date: format(new Date(), 'yyyy-MM-dd'),
                body_part: '가슴',
                notes: '',
                created_at: new Date().toISOString(),
              })}
            >
              운동 기록 추가
            </button>
          </div>
          <WorkoutList 
            userId={sessionUserId} 
            filterBodyPart={filterBodyPart} 
            filterDate={filterDate} 
            refreshKey={refreshKey} 
            onSelect={(w) => setSelectedWorkout(w)}
            onCopyWorkout={handleCopyWorkout}
            onCopyDay={handleCopyDay}
          />
        </div>
        <div className="card space-y-3 p-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="btn-outline px-2 py-1"
              onClick={() => setCalendarMonth(addDays(startOfMonth(calendarMonth), -1))}
            >
              ◀
            </button>
            <div className="font-semibold">{format(calendarMonth, 'MMMM yyyy')}</div>
            <button
              type="button"
              className="btn-outline px-2 py-1"
              onClick={() => setCalendarMonth(addDays(endOfMonth(calendarMonth), 1))}
            >
              ▶
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-600">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((d, i) => {
              const iso = format(d, 'yyyy-MM-dd');
              const hasWorkout = datesWithWorkouts.some((w) => isSameDay(new Date(w), d));
              return (
                <button
                  key={i}
                  type="button"
                  className={`h-12 rounded border text-sm transition-colors ${
                    hasWorkout ? 'bg-orange-50 border-orange-300 calendar-day-with-workout' : 'bg-white hover:bg-orange-25'
                  }`}
                  title={iso}
                  onClick={() => setFilterDate(iso)}
                >
                  <div className="text-xs">{format(d, 'd')}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <dialog id="editorDialog" open={!!selectedWorkout} className="w-full max-w-3xl rounded-lg p-0">
        {selectedWorkout && (
          <div className="space-y-4 card p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{selectedWorkout.id ? '운동 기록 수정' : '운동 기록 추가'}</div>
              <button type="button" className="btn-outline" onClick={() => setSelectedWorkout(null)}>
                ✕
              </button>
            </div>
            <NewWorkoutEditor
              userId={sessionUserId}
              workout={selectedWorkout.id ? selectedWorkout : null}
              onSaved={() => {
                setSelectedWorkout(null);
                setRefreshKey((k) => k + 1);
              }}
              onDeleted={() => {
                setSelectedWorkout(null);
                setRefreshKey((k) => k + 1);
              }}
            />
          </div>
        )}
      </dialog>
    </div>
  );
}


