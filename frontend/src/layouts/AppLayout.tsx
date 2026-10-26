import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar.js';
import { MobileNav } from '../components/layout/MobileNav.js';
import { subscribeBackendStatus } from '../services/apiClient.js';
import { WifiOff, Sparkles } from 'lucide-react';
import { ROUTES } from '../router/routes.js';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const [isBackendOnline, setIsBackendOnline] = useState(true);

  // Subscribe to backend status
  useEffect(() => {
    const unsubscribe = subscribeBackendStatus((online) => {
      setIsBackendOnline(online);
    });
    return unsubscribe;
  }, []);

  // Update document.title per route
  useEffect(() => {
    const titles: Record<string, string> = {
      [ROUTES.DASHBOARD]: 'Dashboard — SignBridge',
      [ROUTES.TRANSLATOR]: 'Live Translator — SignBridge',
      [ROUTES.HISTORY]: 'Translation History — SignBridge',
      [ROUTES.GESTURES]: 'Gesture Library — SignBridge',
      [ROUTES.ABOUT]: 'About Project — SignBridge',
      [ROUTES.SETTINGS]: 'Settings — SignBridge',
    };
    document.title = titles[location.pathname] || 'SignBridge — Gesture Recognition';

    // Move focus to main heading for keyboard & screen-reader accessibility
    const mainHeading = document.getElementById('page-main-heading');
    if (mainHeading) {
      mainHeading.focus();
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-page flex flex-col md:flex-row text-ink">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Top Navigation */}
      <MobileNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="hidden md:flex h-11 items-center justify-between border-b border-line/80 bg-white/70 px-8 text-[11px] text-ink-secondary backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-forest shadow-[0_0_0_3px_rgba(40,103,79,0.12)]" />
            <span className="font-medium">Private browser inference</span>
            <span className="text-ink-muted">·</span>
            <span>Camera frames stay on this device</span>
          </div>
          <div className="flex items-center gap-1.5 text-forest font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>SignBridge v2</span>
          </div>
        </div>
        {/* Offline Banner if backend is unreachable */}
        {!isBackendOnline && (
          <div
            role="status"
            className="bg-status-warningBg border-b border-status-warning/20 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-status-warning"
          >
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span className="font-medium">
                Backend offline — results are running locally and not currently synced to the database.
              </span>
            </div>
            <span className="text-xs bg-white/70 px-2 py-0.5 rounded border border-status-warning/30 font-medium">
              Offline Mode
            </span>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
