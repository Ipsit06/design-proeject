import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  History,
  BookOpen,
  Info,
  Settings,
  HandMetal,
  Database,
  Cpu,
  BarChart2,
} from 'lucide-react';
import { ROUTES } from '../../router/routes.js';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
}

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Live Translator', path: ROUTES.TRANSLATOR, icon: Video },
  { label: 'Translation History', path: ROUTES.HISTORY, icon: History },
  { label: 'Gesture Library', path: ROUTES.GESTURES, icon: BookOpen },
];

const MODEL_NAV: NavItem[] = [
  { label: 'Data Collection', path: ROUTES.COLLECT, icon: Database },
  { label: 'Model Training', path: ROUTES.TRAIN, icon: Cpu },
  { label: 'Evaluation', path: ROUTES.EVALUATE, icon: BarChart2 },
];

const SYSTEM_NAV: NavItem[] = [
  { label: 'About Project', path: ROUTES.ABOUT, icon: Info },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-line bg-white/90 flex flex-col shrink-0 h-screen sticky top-0 shadow-[8px_0_30px_rgba(36,43,38,0.025)] backdrop-blur-sm">
      {/* Brand Header */}
      <div className="p-5 border-b border-line flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-[13px] bg-gradient-to-br from-forest-light to-forest-dark text-white flex items-center justify-center shrink-0 shadow-[0_6px_14px_rgba(40,103,79,0.24)]">
          <HandMetal className="w-6 h-6" />
          <span className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-sage-dark border-2 border-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-ink tracking-tight leading-tight">
            SignBridge
          </h1>
          <p className="text-xs text-ink-secondary font-normal">
            Sign language AI prototype
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto" aria-label="Main Navigation">
        {/* Main Section */}
        <div className="space-y-1">
          {MAIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === ROUTES.DASHBOARD}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3.5 py-2.5 rounded-btn text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-forest text-white font-semibold shadow-[0_5px_12px_rgba(40,103,79,0.16)]'
                      : 'text-ink-secondary hover:text-ink hover:bg-sage-light'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Model Section */}
        <div className="space-y-1 pt-2 border-t border-line">
          <div className="px-3.5 pb-1 text-[11px] font-bold text-ink-muted uppercase tracking-wider">
            Model Pipeline
          </div>
          {MODEL_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3.5 py-2.5 rounded-btn text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-forest text-white font-semibold shadow-[0_5px_12px_rgba(40,103,79,0.16)]'
                      : 'text-ink-secondary hover:text-ink hover:bg-sage-light'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span>{item.label}</span>
                </div>
                {item.tag && (
                  <span className="text-[10px] bg-forest/10 text-forest px-1.5 py-0.2 rounded font-semibold">
                    {item.tag}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* System Section */}
        <div className="space-y-1 pt-2 border-t border-line">
          <div className="px-3.5 pb-1 text-[11px] font-bold text-ink-muted uppercase tracking-wider">
            System
          </div>
          {SYSTEM_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-btn text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sage text-forest font-semibold shadow-xs'
                      : 'text-ink-secondary hover:text-ink hover:bg-page'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Accessibility Project Footer */}
      <div className="p-4 border-t border-line text-xs text-ink-muted bg-page/50">
        <p className="font-medium text-ink-secondary">SignBridge v2.0</p>
        <p className="mt-0.5">TF.js Client Inference</p>
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-forest">
          <span className="w-2 h-2 rounded-full bg-forest animate-pulse inline-block" />
          <span>Local Dual-Hand Vision</span>
        </div>
      </div>
    </aside>
  );
};
