'use client';
import { useEffect, useState } from 'react';
import { Settings, Wifi, Clock, MessageSquare, Copy, Check } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', address: '',
    opening_hours: '', closing_hours: '',
    whatsapp_phone_number_id: '', whatsapp_access_token: ''
  });

  useEffect(() => {
    api.get('/business').then(res => {
      setBusiness(res.data);
      setForm({
        name: res.data.name || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
        opening_hours: res.data.opening_hours || '09:00',
        closing_hours: res.data.closing_hours || '18:00',
        whatsapp_phone_number_id: res.data.whatsapp_phone_number_id || '',
        whatsapp_access_token: res.data.whatsapp_access_token || '',
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/business', form);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin.replace('3000', '5000')}/api/whatsapp/webhook/${business?.id || 'YOUR_BUSINESS_ID'}`
    : '';

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Webhook URL copied!');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full p-20">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure your barbershop and WhatsApp integration</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Info */}
        <div className="rounded-2xl p-6 bg-[#17171f] border border-[#2a2a38]">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-400" /> Business Info
          </h2>
          <div className="space-y-4">
            {[
              { key: 'name', label: 'Business Name', placeholder: "Mike's Barbershop" },
              { key: 'phone', label: 'Phone Number', placeholder: '+1234567890' },
              { key: 'address', label: 'Address', placeholder: '123 Main St, City' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
                <input type="text" placeholder={placeholder}
                  value={(form as any)[key]} onChange={e => setForm({...form, [key]: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f13] border border-[#2a2a38] text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Hours */}
        <div className="rounded-2xl p-6 bg-[#17171f] border border-[#2a2a38]">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" /> Business Hours
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'opening_hours', label: 'Opening Time' },
              { key: 'closing_hours', label: 'Closing Time' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
                <input type="time" value={(form as any)[key]} onChange={e => setForm({...form, [key]: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f13] border border-[#2a2a38] text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp */}
        <div className="rounded-2xl p-6 bg-[#17171f] border border-[#2a2a38]">
          <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-400" /> WhatsApp Business API
          </h2>
          <p className="text-xs text-slate-500 mb-4">Get these from your Meta Developer Console</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Phone Number ID</label>
              <input type="text" placeholder="1234567890"
                value={form.whatsapp_phone_number_id}
                onChange={e => setForm({...form, whatsapp_phone_number_id: e.target.value})}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f13] border border-[#2a2a38] text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Access Token</label>
              <input type="password" placeholder="EAABs..."
                value={form.whatsapp_access_token}
                onChange={e => setForm({...form, whatsapp_access_token: e.target.value})}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f13] border border-[#2a2a38] text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Webhook URL */}
            <div className="mt-4 p-4 rounded-xl bg-[#0f0f13] border border-indigo-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium text-indigo-400">Your Webhook URL</span>
                </div>
                <button type="button" onClick={copyWebhook}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs font-mono text-slate-400 break-all">{webhookUrl}</p>
              <p className="text-xs text-slate-600 mt-2">Paste this in Meta → WhatsApp → Configuration → Webhook URL</p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
