import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Sliders,
  ShieldCheck,
  Trash2,
  Save,
  Bot,
  Layers,
  Clock,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { useToast } from '../components/ui/Toast.js';
import { settingsApi } from '../services/settingsApi.js';
import { historyApi } from '../services/historyApi.js';
import { speakText } from '../lib/speech.js';
import type { AppSettings, RecognitionMode } from '@signbridge/shared';

export const Settings: React.FC = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AppSettings>({
    speechEnabled: true,
    speechRate: 1.0,
    confidenceThreshold: 0.65,
    autoSpeak: false,
    recognitionMode: 'sign_language',
    aiAssistanceEnabled: true,
    holdTimeMs: 350,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await settingsApi.get();
        setSettings({
          speechEnabled: data.speechEnabled ?? true,
          speechRate: data.speechRate ?? 1.0,
          confidenceThreshold: data.confidenceThreshold ?? 0.65,
          autoSpeak: data.autoSpeak ?? false,
          recognitionMode: data.recognitionMode ?? 'sign_language',
          aiAssistanceEnabled: data.aiAssistanceEnabled ?? true,
          holdTimeMs: data.holdTimeMs ?? 350,
        });
      } catch (e) {
        console.warn('[Settings] Error loading settings:', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await settingsApi.update(settings);
      setSettings(updated);
      showToast('Settings saved', {
        type: 'success',
        message: 'Application configuration updated successfully.',
      });
    } catch {
      showToast('Saved locally', {
        type: 'info',
        message: 'Settings updated in local offline storage.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSpeech = () => {
    if (!settings.speechEnabled) {
      showToast('Speech disabled', {
        type: 'warning',
        message: 'Turn on speech synthesis to test audio playback.',
      });
      return;
    }
    speakText('Testing speech synthesis at current rate', {
      rate: settings.speechRate,
    });
  };

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      await historyApi.clearAll();
      setIsClearModalOpen(false);
      showToast('History cleared', {
        type: 'success',
        message: 'All saved translation records were removed.',
      });
    } catch {
      showToast('Failed to clear history', {
        type: 'error',
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Application Settings"
        description="Configure recognition pipelines, speech synthesis rate, model confidence, and temporal hold intervals."
        actions={
          <Button
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save changes
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Model Architecture Settings */}
        <Card className="border-line space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-line">
            <Layers className="w-5 h-5 text-forest" />
            <h2 className="text-base font-bold text-ink">Recognition Model & AI Pipeline</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-ink block mb-1">
                Active Recognition Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, recognitionMode: 'sign_language' })
                  }
                  className={`p-3 text-left rounded-btn border transition-all ${
                    settings.recognitionMode === 'sign_language'
                      ? 'border-forest bg-sage/40 ring-1 ring-forest'
                      : 'border-line bg-page hover:bg-card'
                  }`}
                >
                  <span className="font-bold text-sm text-ink block">
                    ASL Sign Language Model
                  </span>
                  <span className="text-xs text-ink-secondary mt-0.5 block leading-relaxed">
                    Uses 3D landmark geometry to recognize genuine ASL manual alphabet and core conversational signs.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, recognitionMode: 'generic' })
                  }
                  className={`p-3 text-left rounded-btn border transition-all ${
                    settings.recognitionMode === 'generic'
                      ? 'border-forest bg-sage/40 ring-1 ring-forest'
                      : 'border-line bg-page hover:bg-card'
                  }`}
                >
                  <span className="font-bold text-sm text-ink block">
                    MediaPipe Generic Gestures
                  </span>
                  <span className="text-xs text-ink-secondary mt-0.5 block leading-relaxed">
                    Pre-trained generic model for universal postures (Thumbs Up, Fist, Peace Sign).
                  </span>
                </button>
              </div>
            </div>

            {/* AI Assistance Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <div>
                <label
                  htmlFor="ai-toggle"
                  className="text-sm font-semibold text-ink cursor-pointer flex items-center gap-1.5"
                >
                  <Bot className="w-4 h-4 text-forest" />
                  Enable AI Sentence Formatting Assistance
                </label>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Uses backend language model assistance (or local heuristic rules) to polish signed tokens into fluent English.
                </p>
              </div>
              <input
                id="ai-toggle"
                type="checkbox"
                checked={settings.aiAssistanceEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, aiAssistanceEnabled: e.target.checked })
                }
                className="w-5 h-5 rounded text-forest focus:ring-forest cursor-pointer"
              />
            </div>

            {/* Temporal Hold Time Slider */}
            <div className="pt-2 border-t border-line">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="hold-slider"
                  className="text-sm font-semibold text-ink flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4 text-forest" />
                  Sign Confirmation Hold Duration: {settings.holdTimeMs || 350} ms
                </label>
              </div>
              <p className="text-xs text-ink-secondary mb-3">
                Minimum steady hold time required before a sign is recognized and added as a token.
              </p>
              <input
                id="hold-slider"
                type="range"
                min="200"
                max="800"
                step="50"
                value={settings.holdTimeMs || 350}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    holdTimeMs: parseInt(e.target.value, 10),
                  })
                }
                className="w-full h-2 bg-line rounded-lg appearance-none cursor-pointer accent-forest"
              />
              <div className="flex justify-between text-[11px] text-ink-muted mt-1">
                <span>200 ms (Fast / Responsive)</span>
                <span>350 ms (Balanced)</span>
                <span>800 ms (Deliberate)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Speech Configuration */}
        <Card className="border-line space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-line">
            <Volume2 className="w-5 h-5 text-forest" />
            <h2 className="text-base font-bold text-ink">Speech Synthesis</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor="speech-toggle"
                  className="text-sm font-semibold text-ink cursor-pointer"
                >
                  Enable Text-to-Speech Output
                </label>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Allows speaking translated gestures via browser SpeechSynthesis.
                </p>
              </div>
              <input
                id="speech-toggle"
                type="checkbox"
                checked={settings.speechEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, speechEnabled: e.target.checked })
                }
                className="w-5 h-5 rounded text-forest focus:ring-forest cursor-pointer"
              />
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="speech-rate-slider"
                  className="text-sm font-semibold text-ink"
                >
                  Speech Rate: {settings.speechRate.toFixed(2)}x
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestSpeech}
                  disabled={!settings.speechEnabled}
                >
                  Test Speech
                </Button>
              </div>
              <input
                id="speech-rate-slider"
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={settings.speechRate}
                disabled={!settings.speechEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    speechRate: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 bg-line rounded-lg appearance-none cursor-pointer accent-forest disabled:opacity-40"
              />
              <div className="flex justify-between text-[11px] text-ink-muted mt-1">
                <span>0.5x (Slow)</span>
                <span>1.0x (Normal)</span>
                <span>2.0x (Fast)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Model Confidence Threshold */}
        <Card className="border-line space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-line">
            <Sliders className="w-5 h-5 text-forest" />
            <h2 className="text-base font-bold text-ink">Confidence Filter Threshold</h2>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="threshold-slider"
                className="text-sm font-semibold text-ink"
              >
                Minimum Acceptance Confidence: {(settings.confidenceThreshold * 100).toFixed(0)}%
              </label>
            </div>
            <p className="text-xs text-ink-secondary mb-3">
              Signs below this score are treated as uncertain to eliminate false positives. Text is not emitted when uncertain.
            </p>
            <input
              id="threshold-slider"
              type="range"
              min="0.2"
              max="0.95"
              step="0.05"
              value={settings.confidenceThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  confidenceThreshold: parseFloat(e.target.value),
                })
              }
              className="w-full h-2 bg-line rounded-lg appearance-none cursor-pointer accent-forest"
            />
            <div className="flex justify-between text-[11px] text-ink-muted mt-1">
              <span>20% (Sensitive)</span>
              <span>65% (Recommended)</span>
              <span>95% (Strict)</span>
            </div>
          </div>
        </Card>

        {/* Privacy Notice */}
        <Card className="border-line bg-sage/30 space-y-3">
          <div className="flex items-center gap-2 text-forest">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="text-sm font-bold">Privacy Architecture Guarantee</h2>
          </div>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            All 3D hand tracking and landmark inference operates locally inside your browser via WebAssembly. Camera frames never leave your computer and are never uploaded to any server or AI model.
          </p>
        </Card>

        {/* Danger Zone: Clear History */}
        <Card className="border-status-error/30 bg-status-errorBg/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink">Clear Database History</h2>
              <p className="text-xs text-ink-secondary mt-0.5">
                Permanently purge all saved translation records.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsClearModalOpen(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Clear Records
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={isClearModalOpen}
        title="Purge all translation records?"
        message="This will delete every entry from your local history database. This operation is permanent."
        confirmLabel="Purge History"
        variant="danger"
        isLoading={isClearing}
        onConfirm={handleClearHistory}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
};

export default Settings;
