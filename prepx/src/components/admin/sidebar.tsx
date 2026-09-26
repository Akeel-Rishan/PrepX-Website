'use client';

import Image from 'next/image';
import { LogOut, UserCircle } from 'lucide-react';
import { truncate } from '@/lib/utils';
import { SidebarNav } from './sidebar-nav';

interface SidebarProps {
  userEmail: string;
  onNavClick?: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
}

export function Sidebar({
  userEmail,
  onNavClick,
  onLogout,
  isLoggingOut = false,
}: SidebarProps): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-slate-800 bg-[#0a1220]">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/prepx-mark.png"
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
            priority
          />
          <div>
            <span className="block text-lg font-bold tracking-tight text-white">PrepX</span>
            <span className="block text-[11px] font-medium text-slate-400">
              Examination Management
            </span>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:overflow-hidden lg:py-2">
        <SidebarNav onNavClick={onNavClick} />
      </div>
      <div className="border-t border-slate-800 p-3">
        <div className="rounded-xl bg-slate-900/80 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800">
              <UserCircle aria-hidden="true" className="h-4 w-4 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500">Signed in as</p>
              <span title={userEmail} className="block truncate text-xs text-slate-300">
                {truncate(userEmail, 24)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-2 text-xs font-semibold text-slate-300 transition-[background-color,border-color,color,transform] active:scale-[0.98] hover:border-slate-600 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
