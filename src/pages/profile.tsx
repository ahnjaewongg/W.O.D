import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return navigate('/login');
      setUserId(u.id);
      setEmail(u.email ?? '');
      const { data: prof } = await supabase.from('users').select('*').eq('id', u.id).single();
      setDisplayName(prof?.display_name ?? '');
    });
  }, [navigate]);

  async function save() {
    if (!userId) return;
    await supabase.from('users').upsert({ id: userId, email, display_name: displayName });
    alert('Saved');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <header className="flex items-center justify-between">
        <div className="text-xl font-semibold">프로필</div>
        <nav className="flex items-center gap-3">
          <Link to="/" className="text-blue-600 hover:underline">
            홈
          </Link>
          <button type="button" onClick={() => supabase.auth.signOut()} className="rounded border px-3 py-1">
            로그아웃
          </button>
        </nav>
      </header>
      <div className="space-y-3">
        <label className="block">
          <div className="text-sm text-gray-600">이름</div>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600">이메일</div>
          <input className="mt-1 w-full rounded border px-3 py-2" value={email} disabled />
        </label>
        <button type="button" onClick={save} className="rounded bg-blue-600 px-4 py-2 text-white">
          저장
        </button>
      </div>
    </div>
  );
}


