'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Scissors } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/login`, form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f0f13]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-indigo-600">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">BarberBookAI</h1>
          <p className="mt-2 text-slate-400">Sign in to your dashboard</p>
        </div>
        <div className="rounded-2xl p-8 bg-[#17171f] border border-[#2a2a38]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-400">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-[#0f0f13] border border-[#2a2a38] text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@barbershop.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-400">Password</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-[#0f0f13] border border-[#2a2a38] text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center mt-6 text-sm text-slate-400">
            No account? <Link href="/register" className="text-indigo-400 font-medium hover:text-white">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
