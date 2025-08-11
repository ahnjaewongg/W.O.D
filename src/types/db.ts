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

export type SetRow = {
  id: string;
  workout_id: string;
  exercise_name: string;
  rep_count: number;
  weight: number | null;
  set_index: number;
};

export type PhotoRow = {
  id: string;
  workout_id: string;
  user_id: string;
  storage_path: string;
  public_url: string | null;
  created_at: string;
};


