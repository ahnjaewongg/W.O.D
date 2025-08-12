export type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
};

export type WorkoutRow = {
  id: string;
  user_id: string;
  date: string; // ISO date
  body_part: string;
  notes: string | null;
  created_at: string;
};

export type WorkoutWithUser = WorkoutRow & {
  user: UserRow;
};

export type ExerciseRow = {
  id: string;
  workout_id: string;
  exercise_name: string;
  exercise_index: number;
  notes: string | null;
  created_at: string;
};

export type SetRow = {
  id: string;
  exercise_id: string;
  rep_count: number;
  weight: number | null;
  set_index: number;
  notes: string | null;
  created_at: string;
};

// 조인된 데이터 타입
export type ExerciseWithSets = ExerciseRow & {
  sets: SetRow[];
};

export type PhotoRow = {
  id: string;
  workout_id: string | null; // nullable for daily photos
  user_id: string;
  storage_path: string;
  public_url: string | null;
  created_at: string;
  date: string | null; // for daily photos
};


