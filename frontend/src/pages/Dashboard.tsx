import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  ArrowRight,
  HelpCircle,
  Activity,
  Layers,
  CheckCircle,
  Clock,
  Sparkles,
  Bot,
} from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge, SourceBadge } from '../components/ui/Badge.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { statsApi } from '../services/statsApi.js';
import { historyApi } from '../services/historyApi.js';
import { gesturesApi } from '../services/gesturesApi.js';
import { ROUTES } from '../router/routes.js';
import type { DashboardStats, HistoryRecord, GestureMapping } from '@signbridge/shared';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalSaved: 0,
    distinctCategories: 0,
    completedSessions: 0,
    recentActivity: 0,
  });
  const [recentRecords, setRecentRecords] = useState<HistoryRecord[]>([]);
  const [gestures, setGestures] = useState<GestureMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        const [statsData, historyData, gesturesData] = await Promise.all([
          statsApi.get().catch(() => ({
            totalSaved: 0,
            distinctCategories: 0,
            completedSessions: 0,
            recentActivity: 0,
          })),
          historyApi.list({ limit: 5 }).catch(() => ({ items: [], total: 0 })),
          gesturesApi.getAll().catch(() => []),
        ]);
        setStats(statsData);
        setRecentRecords(historyData.items);
        setGestures(gesturesData);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const aslLetters = gestures.filter((g) => g.category.startsWith('ASL_'));
  const hciGestures = gestures.filter((g) => g.category.startsWith('HCI_'));
  const otherGestures = gestures.filter(
    (g) => !g.category.startsWith('ASL_') && !g.category.startsWith('HCI_')
  );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-forest-dark via-forest to-[#3b8668] border border-forest-dark rounded-[20px] p-6 sm:p-9 shadow-[0_16px_35px_rgba(40,103,79,0.18)]">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[28px] border-white/10" />
        <div className="pointer-events-none absolute right-24 -bottom-36 h-72 w-72 rounded-full border-[18px] border-white/5" />
        <div className="relative max-w-3xl">
          <Badge variant="default" className="mb-4 border-white/20 bg-white/10 text-white">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#b9edc9]" />
            Hand Gesture Studio
          </Badge>
          <h1
            tabIndex={-1}
            id="page-main-heading"
            className="text-3xl sm:text-5xl font-bold text-white tracking-[-0.035em] leading-[1.05] focus:outline-none"
          >
            Human-Computer Interaction & ASL Writing
          </h1>
          <p className="text-base text-white/75 mt-4 leading-relaxed max-w-2xl">
            Real-time hand gesture studio powered by trained neural network models. Control your computer with gestures or write words using the ASL manual alphabet.
          </p>
        </div>

        {/* Main Translator Card */}
        <div className="relative mt-8 bg-white rounded-[16px] border border-white/20 p-5 sm:p-6 shadow-[0_12px_25px_rgba(20,65,45,0.18)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-[14px] bg-sage text-forest flex items-center justify-center shrink-0">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-ink">Hand Gesture Studio</h2>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-forest bg-sage px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
                  HCI + ASL Models Loaded
                </span>
              </div>
              <p className="text-sm text-ink-secondary mt-1.5 max-w-lg leading-relaxed">
                Launch the studio for real-time ASL letter-to-word writing and interactive HCI gesture controls (volume, tracking, zoom, clicks).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <Button
              className="flex-1 md:flex-initial"
              onClick={() => navigate(ROUTES.TRANSLATOR)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start translating
            </Button>
            <Button
              variant="outline"
              className="flex-1 md:flex-initial"
              onClick={() => {
                const el = document.getElementById('how-it-works-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else navigate(ROUTES.ABOUT);
              }}
              leftIcon={<HelpCircle className="w-4 h-4" />}
            >
              Architecture
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Section (Zeroes when empty, strictly from database) */}
      <div>
        <h2 className="text-sm font-semibold text-ink-secondary uppercase tracking-wider mb-3">
          Stored Activity & Statistics
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md" className="border-line">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-secondary">Total Saved</span>
              <Activity className="w-4 h-4 text-forest" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-ink mt-2">
              {stats.totalSaved}
            </p>
            <p className="text-xs text-ink-muted mt-1">Verified entries in database</p>
          </Card>

          <Card padding="md" className="border-line">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-secondary">Distinct Signs</span>
              <Layers className="w-4 h-4 text-forest" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-ink mt-2">
              {stats.distinctCategories}
            </p>
            <p className="text-xs text-ink-muted mt-1">Unique vocabulary translated</p>
          </Card>

          <Card padding="md" className="border-line">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-secondary">Sessions</span>
              <CheckCircle className="w-4 h-4 text-forest" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-ink mt-2">
              {stats.completedSessions}
            </p>
            <p className="text-xs text-ink-muted mt-1">Completed recognition sessions</p>
          </Card>

          <Card padding="md" className="border-line">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-secondary">Recent (7 Days)</span>
              <Clock className="w-4 h-4 text-forest" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-ink mt-2">
              {stats.recentActivity}
            </p>
            <p className="text-xs text-ink-muted mt-1">Translations logged this week</p>
          </Card>
        </div>
      </div>

      {/* Architecture Pipeline: 6 Layers */}
      <div id="how-it-works-section">
        <h2 className="text-sm font-semibold text-ink-secondary uppercase tracking-wider mb-3">
          Recognition Pipeline Architecture
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-line">
            <div className="w-8 h-8 rounded-btn bg-sage text-forest flex items-center justify-center font-bold text-sm mb-2.5">
              1
            </div>
            <h3 className="text-sm font-bold text-ink">Camera & 3D Landmarks</h3>
            <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
              Continuous client-side WebAssembly video processing. 21 3D joint points per hand extracted at 30+ FPS.
            </p>
          </Card>

          <Card className="border-line">
            <div className="w-8 h-8 rounded-btn bg-sage text-forest flex items-center justify-center font-bold text-sm mb-2.5">
              2
            </div>
            <h3 className="text-sm font-bold text-ink">Rolling Temporal Buffer</h3>
            <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
              Analyzes joint velocities and hold stability over sliding time windows, suppressing transitional motion blur.
            </p>
          </Card>

          <Card className="border-line">
            <div className="w-8 h-8 rounded-btn bg-sage text-forest flex items-center justify-center font-bold text-sm mb-2.5">
              3
            </div>
            <h3 className="text-sm font-bold text-ink">Model Adapter Dispatch</h3>
            <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
              Dispatches frames to verified ASL spatial-geometric classifiers or generic MediaPipe fallback models.
            </p>
          </Card>

          <Card className="border-line">
            <div className="w-8 h-8 rounded-btn bg-sage text-forest flex items-center justify-center font-bold text-sm mb-2.5">
              4
            </div>
            <h3 className="text-sm font-bold text-ink">Sign Vocabulary Interpretation</h3>
            <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
              Maps geometric postures to ASL fingerspelling letters and conversational sign concepts.
            </p>
          </Card>

          <Card className="border-line">
            <div className="w-8 h-8 rounded-btn bg-sage text-forest flex items-center justify-center font-bold text-sm mb-2.5">
              5
            </div>
            <h3 className="text-sm font-bold text-ink">Sentence Construction</h3>
            <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
              Accumulates chronological tokens with hold-interval gating, with optional AI language-model formatting.
            </p>
          </Card>

          <Card className="border-line">
            <div className="w-8 h-8 rounded-btn bg-sage text-forest flex items-center justify-center font-bold text-sm mb-2.5">
              6
            </div>
            <h3 className="text-sm font-bold text-ink">Speech & Stored Analytics</h3>
            <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
              Instant speech synthesis via Web Speech API and persistent REST API history logging with zero raw video uploads.
            </p>
          </Card>
        </div>
      </div>

      {/* Recent Translations & Vocabulary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Translations */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-secondary uppercase tracking-wider">
              Recent Translations
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.HISTORY)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View all
            </Button>
          </div>

          <Card padding="none" className="border-line divide-y divide-line overflow-hidden">
            {recentRecords.length > 0 ? (
              recentRecords.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-page/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-ink">&ldquo;{item.text}&rdquo;</p>
                      <SourceBadge source={item.source as any} />
                      {item.aiAssisted && (
                        <span className="text-[10px] text-forest font-medium bg-sage px-1.5 py-0.2 rounded">
                          AI
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-secondary">
                      Sign: <span className="font-medium text-ink">{item.category.replace(/^ASL_/, '').replace(/_/g, ' ')}</span>
                      {item.score && ` • ${(item.score * 100).toFixed(0)}% confidence`}
                    </p>
                  </div>
                  <span className="text-xs text-ink-muted shrink-0">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                title="No saved translations yet"
                description="Translations you save will appear here in chronological order."
                actionLabel="Open Translator"
                onAction={() => navigate(ROUTES.TRANSLATOR)}
              />
            )}
          </Card>
        </div>

        {/* Supported Vocabulary Matrix */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-secondary uppercase tracking-wider">
              Supported Vocabulary & Models
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.GESTURES)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Explore library
            </Button>
          </div>

          <Card padding="md" className="border-line space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-status-success" />
                  ASL Alphabet Letters ({aslLetters.length})
                </span>
                <span className="text-[11px] text-forest font-semibold">Trained asl_model</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aslLetters.map((g) => (
                  <span
                    key={g.category}
                    className="text-xs bg-sage/60 border border-forest/20 text-forest px-2.5 py-1 rounded-btn font-bold font-mono"
                  >
                    {g.text}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  HCI Gestures & Actions ({hciGestures.length})
                </span>
                <span className="text-[11px] text-purple-700 font-semibold">Trained gesture_model</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hciGestures.map((g) => (
                  <span
                    key={g.category}
                    className="text-xs bg-purple-50 border border-purple-200 text-purple-900 px-2 py-0.5 rounded-btn font-medium"
                  >
                    {g.text}
                  </span>
                ))}
              </div>
            </div>

            {otherGestures.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Additional Gestures ({otherGestures.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {otherGestures.map((g) => (
                    <span
                      key={g.category}
                      className="text-xs bg-page border border-line text-ink-muted px-2 py-0.5 rounded-btn"
                    >
                      {g.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
