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
    <div className="flex h-full min-h-0 flex-col bg-slate-900">
      <div className="border-b border-slate-700/50 bg-slate-950 p-4">
        <div className="flex items-center gap-2">
          <Image
            src="/brand/prepx-mark.png"
            alt=""
            aria-hidden="true"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 object-contain"
            priority
          />
          <span className="text-lg font-bold text-white">PrepX</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">Examination System</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <SidebarNav onNavClick={onNavClick} />
      </div>
      <div className="border-t border-slate-700/50 bg-slate-950/50 p-3">
        <div className="flex items-center gap-2">
          <UserCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
          <span title={userEmail} className="truncate text-xs text-slate-400">
            {truncate(userEmail, 22)}
          </span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          aria-busy={isLoggingOut}
          className="mt-1.5 flex w-full items-center gap-2 rounded py-2 text-xs text-slate-400 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
          {isLoggingOut ? 'Logging out...' : 'Log Out'}
        </button>
      </div>
    </div>
  );
}
