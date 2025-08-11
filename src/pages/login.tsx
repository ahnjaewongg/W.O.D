import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // 로그인 후에도 users 테이블 레코드 및 group_key 확인
        const { data: userInfo } = await supabase.auth.getUser();
        if (userInfo.user) {
          await supabase.from('users').upsert({
            id: userInfo.user.id,
            email: userInfo.user.email || email,
            display_name: (userInfo.user.email || email).split('@')[0],
          });
          // ensure group_key is auto-assigned from mapping (server-side)
          await supabase.rpc('ensure_group_key_for_current_user');
        }
      } else {
        // signUp 이후 세션이 없으면(Confirm Email ON) 로그인 한번 더 시도 후 프로필 upsert
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (!data.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw signInErr;
        }

        const { data: userInfo } = await supabase.auth.getUser();
        if (userInfo.user) {
          await supabase.from('users').upsert({
            id: userInfo.user.id,
            email,
            display_name: email.split('@')[0],
          });
          // ensure group_key is auto-assigned from mapping (server-side)
          await supabase.rpc('ensure_group_key_for_current_user');
        }
      }
      navigate('/');
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 login-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow">
        <div className="text-center text-xl font-semibold">{mode === 'login' ? '로그인' : '회원가입'}</div>
        <label className="block">
          <div className="text-sm text-gray-600">이메일</div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600">비밀번호</div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'Please wait...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
        <div className="text-center text-sm">
          {mode === 'login' ? (
            <button type="button" className="text-blue-600" onClick={() => setMode('register')}>
              계정이 없으신가요? 회원가입
            </button>
          ) : (
            <button type="button" className="text-blue-600" onClick={() => setMode('login')}>
              이미 계정이 있으신가요? 로그인
            </button>
          )}
        </div>
        <div className="text-center text-xs text-gray-500">
          <Link to="/" className="underline">
            홈
          </Link>
        </div>
      </form>
    </div>
  );
}


