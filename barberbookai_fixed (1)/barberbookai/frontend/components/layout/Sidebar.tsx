'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Users, Scissors, Settings, LogOut, MessageSquare } from 'lucide-react';
import { logout } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/appointments', icon: Calendar, label: 'Appointments' },
  { href: '/dashboard/customers', icon: Users, label: 'Customers' },
  { href: '/dashboard/services', icon: Scissors, label: 'Services' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 min-h-screen flex flex-col bg-[#17171f] border-r border-[#2a2a38]">
      <div className="p-6 border-b border-[#2a2a38]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">BarberBookAI</div>
            <div className="text-xs text-slate-500">WhatsApp Booking</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-[#2a2a38]'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#2a2a38]">
        <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">AI Active</span>
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400 ml-auto" />
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
