'use client';
import { useEffect, useState } from 'react';
import { Calendar, Users, DollarSign, Clock, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { format } from 'date-fns';

interface Stats {
  total_bookings: number;
  todays_bookings: number;
  total_customers: number;
  monthly_revenue: number;
  todays_appointments: any[];
  recent_appointments: any[];
}

const statusColor: Record<string, string> = {
  confirmed: 'bg-emerald-500/20 text-emerald-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  cancelled: 'bg-red-500/20 text-red-400',
  completed: 'bg-blue-500/20 text-blue-400',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full p-20">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const cards = [
    { label: 'Total Bookings', value: stats?.total_bookings || 0, icon: Calendar, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: "Today's Appointments", value: stats?.todays_bookings || 0, icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Customers', value: stats?.total_customers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Monthly Revenue', value: `$${stats?.monthly_revenue || 0}`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome back, {user?.business_name}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl p-6 bg-[#17171f] border border-[#2a2a38]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">{card.label}</p>
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="rounded-2xl p-6 bg-[#17171f] border border-[#2a2a38]">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Today's Schedule
          </h2>
          {stats?.todays_appointments?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No appointments today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.todays_appointments?.map((appt: any) => (
                <div key={appt.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0f0f13]">
                  <div>
                    <p className="text-white font-medium text-sm">{appt.customer_name}</p>
                    <p className="text-slate-400 text-xs">{appt.service}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-mono">{appt.appointment_time}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[appt.status] || ''}`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="rounded-2xl p-6 bg-[#17171f] border border-[#2a2a38]">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Recent Bookings
          </h2>
          {stats?.recent_appointments?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No bookings yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.recent_appointments?.map((appt: any) => (
                <div key={appt.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0f0f13]">
                  <div>
                    <p className="text-white font-medium text-sm">{appt.customer_name}</p>
                    <p className="text-slate-400 text-xs">{appt.service} · {appt.appointment_date}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[appt.status] || ''}`}>
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
