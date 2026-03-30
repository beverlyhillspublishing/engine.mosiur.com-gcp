'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Mail, Users, List, GitBranch, Zap, BarChart3,
  Settings, CreditCard, Code, Webhook, LogOut, Mail as MailIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Campaigns', icon: Mail },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/lists', label: 'Lists', icon: List },
  { href: '/segments', label: 'Segments', icon: GitBranch },
  { href: '/automations', label: 'Automations', icon: Zap },
  { href: '/templates', label: 'Templates', icon: MailIcon },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const settingsItems = [
  { href: '/settings/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings/senders', label: 'Email Senders', icon: Settings },
  { href: '/settings/api-keys', label: 'API Keys', icon: Code },
  { href: '/settings/webhooks', label: 'Webhooks', icon: Webhook },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, currentOrg, user } = useAuth();

  return (
    <div className="flex flex-col h-full w-64 bg-slate-900 text-white">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm">TechyPark</div>
            <div className="text-xs text-slate-400 truncate max-w-[140px]">{currentOrg?.name}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Main</div>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <div className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
            )}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </div>
          </Link>
        ))}

        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 pt-4">Settings</div>
        {settingsItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <div className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
            )}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </div>
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-semibold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-xs text-slate-400 truncate">{user?.email}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-slate-400 hover:text-white hover:bg-slate-800 justify-start gap-2"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
