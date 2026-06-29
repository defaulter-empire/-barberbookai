'use client';
import { useEffect, useState } from 'react';
import { Plus, Search, Calendar, Phone, Filter } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_name: '', phone: '', service: '', appointment_date: '', appointment_time: '', notes: ''
  });

  const fetchAppointments = async () => {
    try {
      const params: any = {};
      if (filterDate) params.date = filterDate;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/appointments', { params });
      setAppointments(res.data.appointments || []);
    } catch (err) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    api.get('/services').then(res => setServices(res.data || []));
  }, [filterDate, filterStatus]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/appointments', form);
      toast.success('Appointment booked!');
      setShowModal(false);
      setForm({ customer_name: '', phone: '', service: '', appointment_date: '', appointment_time: '', notes: '' });
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to book');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch { toast.error('Failed to cancel'); }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.patch(`/appointments/${id}`, { status: 'completed' });
      toast.success('Marked as completed');
      fetchAppointments();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Appointments</h1>
          <p className="text-slate-400 mt-1">{appointments.length} total</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all">
          <Plus className="w-4 h-4" /> New Appointment
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#17171f] border border-[#2a2a38] text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-[#17171f] border border-[#2a2a38] text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(filterDate || filterStatus) && (
          <button onClick={() => { setFilterDate(''); setFilterStatus(''); }}
            className="px-3 py-2 text-slate-400 hover:text-white text-sm">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#17171f] border border-[#2a2a38] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a38]">
                {['Customer', 'Service', 'Date', 'Time', 'Phone', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a38]">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading...</td></tr>
              ) : appointments.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No appointments found</td></tr>
              ) : appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-[#1f1f2a] transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{appt.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{appt.service}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{appt.appointment_date}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-300">{appt.appointment_time}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{appt.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[appt.status] || ''}`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {appt.status === 'confirmed' && (
                        <button onClick={() => handleComplete(appt.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all">
                          Complete
                        </button>
                      )}
                      {['pending', 'confirmed'].includes(appt.status) && (
                        <button onClick={() => handleCancel(appt.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#17171f] border border-[#2a2a38] p-6">
            <h2 className="text-lg font-bold text-white mb-5">New Appointment</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { key: 'customer_name', label: 'Customer Name', type: 'text', placeholder: 'John Smith' },
                { key: 'phone', label: 'WhatsApp Phone', type: 'tel', placeholder: '+1234567890' },
                { key: 'appointment_date', label: 'Date', type: 'date', placeholder: '' },
                { key: 'appointment_time', label: 'Time', type: 'time', placeholder: '' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
                  <input type={type} placeholder={placeholder}
                    value={(form as any)[key]} onChange={e => setForm({...form, [key]: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f13] border border-[#2a2a38] text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Service</label>
                <select value={form.service} onChange={e => setForm({...form, service: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f13] border border-[#2a2a38] text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required>
                  <option value="">Select service...</option>
                  {services.map((s: any) => (
                    <option key={s.id} value={s.name}>{s.name} - ${s.price}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#2a2a38] text-slate-400 hover:text-white text-sm transition-all">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all">
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
