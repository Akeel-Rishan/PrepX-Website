'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './sidebar';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  onLogout: () => void;
  isLoggingOut?: boolean;
}

export function MobileDrawer({
  isOpen,
  onClose,
  userEmail,
  onLogout,
  isLoggingOut,
}: MobileDrawerProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const elements = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), [tabindex="0"]'
      );
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        id="admin-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        className="absolute left-0 top-0 flex h-full w-64 max-w-[calc(100vw-2rem)] flex-col bg-slate-900 shadow-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded p-2 text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <X aria-hidden="true" className="h-5 w-5" />
          <span className="sr-only">Close menu</span>
        </button>
        <Sidebar
          userEmail={userEmail}
          onNavClick={onClose}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
        />
      </div>
    </div>
  );
}
