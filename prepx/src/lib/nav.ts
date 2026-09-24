import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BookOpen,
  PenLine,
  Upload,
  ClipboardCheck,
  Send,
  ScrollText,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: 'Management',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Examinations', href: '/admin/examinations', icon: ClipboardList },
      { label: 'Students', href: '/admin/students', icon: Users },
      { label: 'Subjects', href: '/admin/subjects', icon: BookOpen },
      { label: 'Grade Entry', href: '/admin/results', icon: PenLine },
    ],
  },
  {
    groupLabel: 'Publishing',
    items: [
      { label: 'Import Data', href: '/admin/import', icon: Upload },
      { label: 'Review', href: '/admin/review', icon: ClipboardCheck },
      { label: 'Publication', href: '/admin/publication', icon: Send },
    ],
  },
  {
    groupLabel: 'System',
    items: [{ label: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.href, item.label])
);

export function isNavItemActive(itemHref: string, pathname: string): boolean {
  return (
    pathname === itemHref ||
    (itemHref !== '/admin/dashboard' && pathname.startsWith(`${itemHref}/`))
  );
}

export function getAdminPageTitle(pathname: string): string {
  return (
    PAGE_TITLES[pathname] ??
    NAV_ITEMS.find((item) => isNavItemActive(item.href, pathname))?.label ??
    'Admin'
  );
}
