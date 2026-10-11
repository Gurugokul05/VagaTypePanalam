'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import HeaderLogo from './HeaderLogo';
import { useUIStore } from '@/store/uiStore';
import { signOut } from 'next-auth/react';
import {
  Keyboard,
  Timer,
  Gamepad2,
  BookOpen,
  BarChart2,
  Shield,
  Menu,
  X,
  Globe,
  LogOut,
  Sun,
  Moon,
  Settings,
} from 'lucide-react';

const NAV = [
  { href: '/', label: 'Practice', icon: Keyboard },
  { href: '/test', label: 'Test', icon: Timer },
  { href: '/race', label: 'Race', icon: Gamepad2 },
  { href: '/lessons', label: 'Lessons', icon: BookOpen },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
] as const;

export default function SideNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { language, setLanguage, theme, toggleTheme } = useUIStore();

  if (!session?.user) return null;

  const isAdmin = (session.user as { role?: string }).role === 'ADMIN';

  return (
    <>
      {/* Desktop vertical rail — logo transferred here — light/dark visible */}
      <aside
        className="fixed left-3 top-[calc(var(--header-height)+12px)] z-40 hidden h-[calc(100vh-var(--header-height)-24px)] w-[64px] flex-col items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 p-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] transition-all duration-300 lg:flex"
      >
        {/* Logo — exact same as TopHeader (HeaderLogo) */}
        <Link href="/" className="mb-1 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[var(--bg-overlay)] p-1.5" title="VangaTypePanalam">
          <span className="scale-[0.45] [&_svg]:h-[76px] [&_svg]:w-auto">
            <HeaderLogo />
          </span>
        </Link>
        <div className="mb-1 h-px w-8 bg-[var(--border-subtle)]" />
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                active
                  ? 'bg-[var(--color-primary)] text-white shadow-[0_0_16px_var(--color-primary-glow)] ring-1 ring-white/20 scale-[1.06]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] hover:scale-110 hover:shadow-md'
              }`}
            >
              <Icon size={18} />
              {active && (
                <span
                  className="absolute -left-1 h-6 w-1 rounded-full bg-violet-400"
                />
              )}
            </Link>
          );
        })}
        {isAdmin && (
          <>
            <div className="my-1 h-px w-8 bg-[var(--border-subtle)]" />
            <Link
              href="/admin"
              title="Admin"
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                pathname === '/admin'
                  ? 'bg-amber-500 text-black shadow-md scale-[1.06]'
                  : 'text-[var(--text-secondary)] hover:bg-amber-500/15 hover:text-amber-600 hover:scale-110'
              }`}
            >
              <Shield size={18} />
            </Link>
          </>
        )}
        {/* Extras — language, theme, discord, logout — all light/dark visible */}
        <div className="mt-auto flex flex-col items-center gap-1.5 pt-2 border-t border-[var(--border-subtle)] w-full">
          <div className="flex flex-col gap-1">
            <button onClick={() => setLanguage('en')} title="English" className={`h-8 w-8 rounded-lg text-[10px] font-bold transition-all hover:scale-110 ${language === 'en' ? 'bg-[var(--color-primary)] text-white shadow' : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>EN</button>
            <button onClick={() => setLanguage('ta')} title="Tamil" className={`h-8 w-8 rounded-lg text-[10px] font-bold transition-all hover:scale-110 ${language === 'ta' ? 'bg-[var(--color-primary)] text-white shadow' : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>த</button>
          </div>
          <button onClick={toggleTheme} title="Toggle theme" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] hover:scale-110 transition-all">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <a href="https://discord.gg/SdMfbbdjtj" target="_blank" rel="noopener noreferrer" title="Discord" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5865F2]/15 text-[#5865F2] hover:bg-[#5865F2] hover:text-white hover:scale-110 transition-all">
            <Globe size={14} />
          </a>
          <button onClick={() => signOut()} title="Logout — visible in both themes" className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:scale-110 transition-all border border-red-500/20">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Mobile floating dock — light/dark visible */}
      <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500 text-white"
          aria-label="Open menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="hidden h-6 w-px bg-[var(--border-subtle)] sm:block" />
        <div className="hidden items-center gap-1 sm:flex">
          {NAV.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                  active ? 'bg-[var(--color-primary)] text-white shadow' : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <Icon size={16} />
              </Link>
            );
          })}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="absolute bottom-20 left-1/2 flex w-[90%] max-w-sm -translate-x-1/2 flex-col gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 shadow-2xl transition-all"
          >
            {[...NAV, ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield } as const] : [])].map(
              (item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-transform hover:scale-[1.01] ${
                      active ? 'bg-[var(--color-primary)] text-white shadow' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon size={18} /> {item.label}
                  </Link>
                );
              }
            )}
            <div className="my-2 h-px bg-[var(--border-subtle)]" />
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { setLanguage('en'); setOpen(false); }} className={`rounded-lg py-2 text-xs font-bold hover:scale-105 transition-transform ${language === 'en' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>EN</button>
              <button onClick={() => { setLanguage('ta'); setOpen(false); }} className={`rounded-lg py-2 text-xs font-bold hover:scale-105 transition-transform ${language === 'ta' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>தமிழ்</button>
              <button onClick={() => { setLanguage('tanglish' as any); setOpen(false); }} className={`rounded-lg py-2 text-xs font-bold hover:scale-105 transition-transform ${language === 'tanglish' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>TG</button>
            </div>
            <div className="flex gap-2">
              <button onClick={toggleTheme} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--bg-overlay)] py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:scale-105 transition-transform">
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} Theme
              </button>
              <a href="https://discord.gg/SdMfbbdjtj" target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#5865F2] py-2.5 text-sm font-semibold text-white hover:scale-105 transition-transform">Discord</a>
            </div>
            <button onClick={() => signOut()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-2.5 text-sm font-semibold text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white hover:scale-105 transition-all">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}
