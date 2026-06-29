'use client';
import { useEffect, useState } from 'react';
import { Search, User, Phone, Scissors } from 'lucide-react';
import api from '@/lib/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      api.get('/customers', { params: { search } })
        .then(res => { setCustomers(res.data.customers || []); setTotal(res.data.total || 0); })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <p className="text-slate-400 mt-1">{total} total customers</p>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#17171f] border border-[#2a2a38] text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({length: 6}).map((_, i) => (
            <div key={i} className="rounded-2xl h-32 bg-[#17171f] border border-[#2a2a38] animate-pulse" />
          ))
        ) : customers.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No customers yet</p>
          </div>
        ) : customers.map((c: any) => (
          <div key={c.id} className="rounded-2xl p-5 bg-[#17171f] border border-[#2a2a38] hover:border-indigo-500/40 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <span className="text-indigo-400 font-bold text-sm">{c.name?.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {c.total_visits} visit{c.total_visits !== 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="text-white font-semibold">{c.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-sm">
              <Phone className="w-3.5 h-3.5" />
              {c.phone}
            </div>
            <p className="text-slate-500 text-xs mt-2">
              Since {new Date(c.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
