'use client';
import { useEffect, useState } from 'react';
import { Plus, Scissors, DollarSign, Clock, Trash2, Edit3 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', price: '', duration_minutes: '', description: '' });

  const fetch = () => api.get('/services').then(res => setServices(res.data || []));
  useEffect(() => { fetch(); }, []);

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, price: s.price, duration_minutes: s.duration_minutes, description: s.description || '' });
    setShowModal(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', price: '', duration_minutes: '', description: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/services/${editing.id}`, form);
        toast.success('Service updated');
      } else {
        await api.post('/services', form);
        toast.success('Service added');
      }
      setShowModal(false);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    try {
      await api.delete(`/services/${id}`);
      toast.success('Service deleted');
      fetch();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Services</h1>
          <p className="text-slate-400 mt-1">{services.length} services offered</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((s: any) => (
          <div key={s.id} className="rounded-2xl p-5 bg-[#17171f] border border-[#2a2a38] hover:border-indigo-500/30 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-[#2a2a38] text-slate-400 hover:text-white transition-all">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <h3 className="text-white font-semibold text-lg">{s.name}</h3>
            {s.description && <p className="text-slate-500 text-sm mt-1">{s.description}</p>}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#2a2a38]">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">${s.price}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-400 text-sm">{s.duration_minutes} min</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#17171f] border border-[#2a2a38] p-6">
            <h2 className="text-lg font-bold text-white mb-5">{editing ? 'Edit' : 'Add'} Service</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: 'name', label: 'Service Name', type: 'text', placeholder: 'Haircut' },
                { key: 'price', label: 'Price ($)', type: 'number', placeholder: '25' },
                { key: 'duration_minutes', label: 'Duration (minutes)', type: 'number', placeholder: '30' },
                { key: 'description', label: 'Description (optional)', type: 'text', placeholder: 'Classic haircut...' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
                  <input type={type} placeholder={placeholder}
                    value={(form as any)[key]} onChange={e => setForm({...form, [key]: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f13] border border-[#2a2a38] text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required={key !== 'description'} />
                </div>
              ))}
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#2a2a38] text-slate-400 hover:text-white text-sm">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">
                  {editing ? 'Save Changes' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
