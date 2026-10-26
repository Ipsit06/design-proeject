import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Menu,
  X,
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

const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Live Translator', path: ROUTES.TRANSLATOR, icon: Video },
  { label: 'Data Collection', path: ROUTES.COLLECT, icon: Database },
  { label: 'Model Training', path: ROUTES.TRAIN, icon: Cpu },
  { label: 'Evaluation', path: ROUTES.EVALUATE, icon: BarChart2 },
  { label: 'Translation History', path: ROUTES.HISTORY, icon: History },
  { label: 'Gesture Library', path: ROUTES.GESTURES, icon: BookOpen },
  { label: 'About Project', path: ROUTES.ABOUT, icon: Info },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
];

export const MobileNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden border-b border-line bg-card sticky top-0 z-40">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-btn bg-forest text-white flex items-center justify-center">
            <HandMetal className="w-5 h-5" />
          </div>
          <span className="font-bold text-base text-ink">SignBridge</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-btn border border-line text-ink-secondary hover:text-ink focus:outline-none focus:ring-2 focus:ring-forest"
          aria-label="Toggle Navigation Menu"
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <nav className="p-4 pt-0 border-t border-line space-y-1 bg-card animate-in fade-in slide-in-from-top-2 duration-150 max-h-[75vh] overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === ROUTES.DASHBOARD}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-btn text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sage text-forest font-semibold'
                      : 'text-ink-secondary hover:text-ink hover:bg-page'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
};
