import { useState } from 'react';
import type { ExerciseWithSets, SetRow } from '../types/db';

type ExerciseEditorProps = {
  exercise: ExerciseWithSets;
  exerciseIndex: number;
  onUpdate: (exercise: ExerciseWithSets) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export default function ExerciseEditor({
  exercise,
  exerciseIndex,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: ExerciseEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const updateExerciseName = (exercise_name: string) => {
    onUpdate({ ...exercise, exercise_name });
  };

  const updateExerciseNotes = (notes: string) => {
    onUpdate({ ...exercise, notes });
  };

  const addSet = () => {
    const newSet: SetRow = {
      id: crypto.randomUUID(), // 임시 ID
      exercise_id: exercise.id,
      rep_count: exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1].rep_count : 10,
      weight: exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1].weight : 20,
      set_index: exercise.sets.length + 1,
      notes: null,
      created_at: new Date().toISOString(),
    };
    onUpdate({
      ...exercise,
      sets: [...exercise.sets, newSet],
    });
  };

  const updateSet = (setIndex: number, updates: Partial<SetRow>) => {
    const updatedSets = exercise.sets.map((set, idx) =>
      idx === setIndex ? { ...set, ...updates } : set
    );
    onUpdate({ ...exercise, sets: updatedSets });
  };

  const deleteSet = (setIndex: number) => {
    const updatedSets = exercise.sets
      .filter((_, idx) => idx !== setIndex)
      .map((set, idx) => ({ ...set, set_index: idx + 1 }));
    onUpdate({ ...exercise, sets: updatedSets });
  };

  const duplicateSet = (setIndex: number) => {
    const setToCopy = exercise.sets[setIndex];
    const newSet: SetRow = {
      ...setToCopy,
      id: crypto.randomUUID(),
      set_index: exercise.sets.length + 1,
      created_at: new Date().toISOString(),
    };
    onUpdate({
      ...exercise,
      sets: [...exercise.sets, newSet],
    });
  };

  return (
    <div className="card p-4 bg-blue-50 border-blue-200">
      {/* 운동 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
            <span className="text-sm font-semibold text-blue-800">
              운동 {exerciseIndex + 1}
            </span>
          </div>
          
          <input
            type="text"
            value={exercise.exercise_name}
            onChange={(e) => updateExerciseName(e.target.value)}
            className="flex-1 rounded border px-3 py-2 font-semibold"
            placeholder="운동명 (예: 벤치프레스)"
            list={`exercise-suggestions-${exercise.id}`}
          />
        </div>

        <div className="flex items-center gap-1">
          {/* 순서 변경 버튼 */}
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="btn-outline px-2 py-1 text-xs disabled:opacity-50"
            title="위로 이동"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="btn-outline px-2 py-1 text-xs disabled:opacity-50"
            title="아래로 이동"
          >
            ↓
          </button>
          
          {/* 운동 삭제 */}
          <button
            type="button"
            onClick={onDelete}
            className="btn-outline px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            title="운동 삭제"
          >
            🗑️
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* 운동 메모 */}
          <div className="mb-3">
            <input
              type="text"
              value={exercise.notes || ''}
              onChange={(e) => updateExerciseNotes(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="운동 메모 (예: 드롭세트, 슈퍼세트)"
            />
          </div>

          {/* 세트 테이블 */}
          <div className="bg-white rounded border overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-2 bg-gray-50 text-sm font-semibold text-gray-700">
              <div className="col-span-2">세트</div>
              <div className="col-span-3">횟수</div>
              <div className="col-span-3">무게(kg)</div>
              <div className="col-span-3">메모</div>
              <div className="col-span-1">액션</div>
            </div>
            
            {exercise.sets.map((set, setIndex) => (
              <div key={set.id} className="grid grid-cols-12 gap-2 p-2 border-t">
                <div className="col-span-2 flex items-center text-sm font-medium">
                  {setIndex + 1}
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    value={set.rep_count}
                    onChange={(e) => updateSet(setIndex, { rep_count: Number(e.target.value) })}
                    className="w-full rounded border px-2 py-1 text-center"
                    min={1}
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    value={set.weight || 0}
                    onChange={(e) => updateSet(setIndex, { weight: Number(e.target.value) })}
                    className="w-full rounded border px-2 py-1 text-center"
                    min={0}
                    step="0.5"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={set.notes || ''}
                    onChange={(e) => updateSet(setIndex, { notes: e.target.value })}
                    className="w-full rounded border px-2 py-1 text-xs"
                    placeholder="실패, 드롭 등"
                  />
                </div>
                <div className="col-span-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => duplicateSet(setIndex)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="세트 복제"
                  >
                    📋
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSet(setIndex)}
                    className="text-xs text-red-600 hover:text-red-800"
                    title="세트 삭제"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 세트 추가 버튼 */}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={addSet}
              className="btn-outline text-sm"
            >
              + 세트 추가
            </button>
            {exercise.sets.length > 0 && (
              <button
                type="button"
                onClick={() => duplicateSet(exercise.sets.length - 1)}
                className="btn-outline text-sm"
              >
                📋 마지막 세트 복제
              </button>
            )}
          </div>
        </>
      )}

      {/* 운동명 자동완성 */}
      <datalist id={`exercise-suggestions-${exercise.id}`}>
        {[
          '벤치프레스', '스쿼트', '데드리프트', '오버헤드프레스', '바벨로우',
          '인클라인 벤치프레스', '덤벨 플라이', '렛풀다운', '케이블로우', '사이드레터럴레이즈',
          '바이셉컬', '트라이셉 익스텐션', '레그프레스', '레그컬', '레그익스텐션',
          '칩업', '딥스', '플랭크', '크런치'
        ].map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
