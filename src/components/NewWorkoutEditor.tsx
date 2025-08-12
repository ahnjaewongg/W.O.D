import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import type { ExerciseWithSets, WorkoutRow } from '../types/db';
import ExerciseEditor from './ExerciseEditor';

type EditableExercise = {
  id?: string;
  workout_id: string;
  exercise_name: string;
  exercise_index: number;
  notes: string | null;
  created_at?: string;
  sets: SetRow[];
};

type SetRow = {
  id?: string;
  exercise_id: string;
  rep_count: number;
  weight: number | null;
  set_index: number;
  notes: string | null;
  created_at?: string;
};

type Props = {
  userId: string;
  workout?: WorkoutRow | null;
  onSaved?: (workout: WorkoutRow) => void;
  onDeleted?: () => void;
};

function emptyExercise(index: number): EditableExercise {
  return {
    workout_id: '',
    exercise_name: '',
    exercise_index: index,
    notes: null,
    sets: [],
  };
}

export default function NewWorkoutEditor({ userId, workout, onSaved, onDeleted }: Props) {
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [bodyPart, setBodyPart] = useState('가슴');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([emptyExercise(0)]);
  const [saving, setSaving] = useState(false);
  const [recentWorkouts, setRecentWorkouts] = useState<(WorkoutRow & { exercises: ExerciseWithSets[] })[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!workout) return;
      setDate(workout.date);
      setBodyPart(workout.body_part);
      setNotes(workout.notes ?? '');
      
      const { data } = await supabase
        .from('exercises')
        .select(`
          *,
          sets:sets(*)
        `)
        .eq('workout_id', workout.id)
        .order('exercise_index');
      
      if (data && data.length > 0) {
        setExercises(data as EditableExercise[]);
      }
    };
    load();
  }, [workout]);

  // 최근 운동 기록 불러오기 (새 운동 추가할 때만)
  useEffect(() => {
    const loadRecentWorkouts = async () => {
      if (workout) return; // 기존 운동 수정 시에는 템플릿 불필요
      
      const { data } = await supabase
        .from('workouts')
        .select(`
          *, 
          exercises:exercises(
            *,
            sets:sets(*)
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(10);
      
      if (data) {
        setRecentWorkouts(data as (WorkoutRow & { exercises: ExerciseWithSets[] })[]);
      }
    };
    loadRecentWorkouts();
  }, [userId, workout]);

  const updateExercise = (index: number, updatedExercise: ExerciseWithSets) => {
    const editableExercise: EditableExercise = {
      id: updatedExercise.id,
      workout_id: updatedExercise.workout_id,
      exercise_name: updatedExercise.exercise_name,
      exercise_index: index,
      notes: updatedExercise.notes,
      created_at: updatedExercise.created_at,
      sets: updatedExercise.sets.map(set => ({
        id: set.id,
        exercise_id: set.exercise_id,
        rep_count: set.rep_count,
        weight: set.weight,
        set_index: set.set_index,
        notes: set.notes,
        created_at: set.created_at,
      }))
    };
    setExercises(prev => prev.map((ex, idx) => 
      idx === index ? editableExercise : ex
    ));
  };

  const addExercise = () => {
    setExercises(prev => [...prev, emptyExercise(prev.length)]);
  };

  const deleteExercise = (index: number) => {
    setExercises(prev => 
      prev
        .filter((_, idx) => idx !== index)
        .map((ex, idx) => ({ ...ex, exercise_index: idx }))
    );
  };

  const moveExercise = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= exercises.length) return;
    
    setExercises(prev => {
      const newExercises = [...prev];
      const [moved] = newExercises.splice(fromIndex, 1);
      newExercises.splice(toIndex, 0, moved);
      return newExercises.map((ex, idx) => ({ ...ex, exercise_index: idx }));
    });
  };

  const loadFromTemplate = (templateWorkout: WorkoutRow & { exercises: ExerciseWithSets[] }) => {
    setBodyPart(templateWorkout.body_part);
    setNotes('');
    
    if (templateWorkout.exercises && templateWorkout.exercises.length > 0) {
      const templateExercises: EditableExercise[] = templateWorkout.exercises.map((exercise, index) => ({
        workout_id: '',
        exercise_name: exercise.exercise_name,
        exercise_index: index,
        notes: exercise.notes,
        sets: exercise.sets.map((set, setIndex) => ({
          id: crypto.randomUUID(),
          exercise_id: '',
          rep_count: set.rep_count,
          weight: set.weight,
          set_index: setIndex + 1,
          notes: set.notes,
          created_at: new Date().toISOString(),
        })),
      }));
      setExercises(templateExercises);
    } else {
      setExercises([emptyExercise(0)]);
    }
  };

  async function handleSave() {
    setSaving(true);
    try {
      let savedWorkout: WorkoutRow | null = null;
      
      // 1. 워크아웃 저장
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
        
        // 기존 운동들 삭제 (exercises 삭제 시 sets도 cascade로 삭제됨)
        await supabase.from('exercises').delete().eq('workout_id', workout.id);
      }

      if (!savedWorkout) throw new Error('Failed to save workout');

      // 2. 운동들 저장
      for (const exercise of exercises) {
        if (!exercise.exercise_name.trim()) continue;
        
        const { data: savedExercise, error: exerciseError } = await supabase
          .from('exercises')
          .insert({
            workout_id: savedWorkout.id,
            exercise_name: exercise.exercise_name,
            exercise_index: exercise.exercise_index,
            notes: exercise.notes,
          })
          .select()
          .single();
        
        if (exerciseError) throw exerciseError;
        
        // 3. 세트들 저장
        if (exercise.sets && exercise.sets.length > 0) {
          const setsPayload = exercise.sets.map((set, idx) => ({
            exercise_id: savedExercise.id,
            rep_count: Number(set.rep_count),
            weight: set.weight === null ? null : Number(set.weight),
            set_index: idx + 1,
            notes: set.notes,
          }));
          
          const { error: setsError } = await supabase.from('sets').insert(setsPayload);
          if (setsError) throw setsError;
        }
      }

      onSaved?.(savedWorkout);
    } catch (e) {
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
      {/* 새 운동일 때만 템플릿 선택 표시 */}
      {!workout && recentWorkouts.length > 0 && (
        <div className="card p-3 bg-blue-50 border-blue-200">
          <div className="text-sm font-semibold text-blue-800 mb-2">🚀 빠른 시작</div>
          <div className="text-xs text-blue-600 mb-2">이전 운동을 템플릿으로 사용하세요</div>
          <select 
            onChange={(e) => {
              if (e.target.value) {
                const templateWorkout = recentWorkouts.find(w => w.id === e.target.value);
                if (templateWorkout) {
                  loadFromTemplate(templateWorkout);
                }
              }
            }}
            className="w-full rounded border px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">템플릿 선택...</option>
            {recentWorkouts.map((w) => (
              <option key={w.id} value={w.id}>
                {w.date} - {w.body_part} ({w.exercises?.length || 0}개 운동)
              </option>
            ))}
          </select>
        </div>
      )}
      
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

      {/* 운동 목록 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="font-semibold">운동 목록</div>
          <button type="button" className="btn-outline" onClick={addExercise}>
            + 운동 추가
          </button>
        </div>
        
        <div className="space-y-3">
          {exercises.map((exercise, index) => (
            <ExerciseEditor
              key={`${exercise.id || 'new'}-${index}`}
              exercise={{
                id: exercise.id || crypto.randomUUID(),
                workout_id: exercise.workout_id,
                exercise_name: exercise.exercise_name,
                exercise_index: exercise.exercise_index,
                notes: exercise.notes,
                created_at: exercise.created_at || new Date().toISOString(),
                sets: exercise.sets.map(set => ({
                  id: set.id || crypto.randomUUID(),
                  exercise_id: set.exercise_id,
                  rep_count: set.rep_count,
                  weight: set.weight,
                  set_index: set.set_index,
                  notes: set.notes,
                  created_at: set.created_at || new Date().toISOString(),
                }))
              }}
              exerciseIndex={index}
              onUpdate={(updatedExercise) => updateExercise(index, updatedExercise)}
              onDelete={() => deleteExercise(index)}
              onMoveUp={() => moveExercise(index, index - 1)}
              onMoveDown={() => moveExercise(index, index + 1)}
              canMoveUp={index > 0}
              canMoveDown={index < exercises.length - 1}
            />
          ))}
        </div>
      </div>

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


