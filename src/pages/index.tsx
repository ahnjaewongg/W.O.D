import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import type { WorkoutRow } from '../types/db';
import WorkoutList from '../components/WorkoutList';
import WorkoutEditor from '../components/WorkoutEditor';

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

  if (!sessionUserId) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <header className="flex items-center justify-between">
        <div className="text-xl font-semibold workout-character friends-trio">운동 기록</div>
        <nav className="flex items-center gap-3">
          <Link to="/profile" className="text-blue-600 hover:underline">
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
          <WorkoutList userId={sessionUserId} filterBodyPart={filterBodyPart} filterDate={filterDate} refreshKey={refreshKey} onSelect={(w) => setSelectedWorkout(w)} />
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
            <WorkoutEditor
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


