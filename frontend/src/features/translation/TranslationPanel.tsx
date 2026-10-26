import React, { useState } from 'react';
import {
  Copy,
  Volume2,
  BookmarkPlus,
  Trash2,
  Sparkles,
  Bot,
  Undo2,
  Check,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { useToast } from '../../components/ui/Toast.js';
import { copyToClipboard } from '../../lib/clipboard.js';
import { speakText, isSpeechSupported } from '../../lib/speech.js';
import { historyApi } from '../../services/historyApi.js';
import { queueOfflineRecord } from '../../lib/offlineQueue.js';
import type { RecognizedToken } from './sequenceManager.js';
import type { HistoryRecord, AppSettings, HistorySource, RecognitionMode } from '@signbridge/shared';
import type { ExtendedRecognitionStatus } from '../recognition/useGestureRecognition.js';

interface TranslationPanelProps {
  currentSign: string | null;
  currentConfidence: number | null;
  status: ExtendedRecognitionStatus;
  statusMessage: string;
  tokens: RecognizedToken[];
  sentenceText: string;
  isAiAssisted: boolean;
  aiProvider?: string;
  aiExplanation?: string;
  settings: AppSettings;
  sessionId: string | null;
  mode: RecognitionMode;
  source?: HistorySource;
  onClearSequence: () => void;
  onUndoToken: () => void;
  onAiPolish?: () => void;
  isPolishing?: boolean;
  onRecordSaved?: (record: HistoryRecord) => void;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  currentSign,
  currentConfidence,
  status,
  statusMessage,
  tokens,
  sentenceText,
  isAiAssisted,
  aiProvider,
  aiExplanation,
  settings,
  sessionId,
  mode,
  source = 'live',
  onClearSequence,
  onUndoToken,
  onAiPolish,
  isPolishing = false,
  onRecordSaved,
}) => {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [recentSavedList, setRecentSavedList] = useState<HistoryRecord[]>([]);

  const displayText = sentenceText || tokens.map((t) => t.text).join(' ');
  const hasContent = Boolean(displayText.trim());

  // Copy handler
  const handleCopy = async () => {
    if (!displayText) return;
    const ok = await copyToClipboard(displayText);
    if (ok) {
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2000);
      showToast('Copied to clipboard', {
        type: 'success',
        message: `"${displayText}" copied.`,
      });
    }
  };

  // Speak handler
  const handleSpeak = () => {
    if (!displayText) return;
    if (!settings.speechEnabled) {
      showToast('Speech is disabled', {
        type: 'warning',
        message: 'Enable speech in Settings to hear synthesized speech.',
      });
      return;
    }
    if (!isSpeechSupported()) {
      showToast('Speech unsupported', {
        type: 'warning',
        message: 'Browser SpeechSynthesis is unavailable.',
      });
      return;
    }

    speakText(displayText, {
      rate: settings.speechRate,
      onError: () => {
        showToast('Playback error', { type: 'error' });
      },
    });
  };

  // Save handler
  const handleSave = async () => {
    if (!hasContent) return;
    setIsSaving(true);
    try {
      const record = await historyApi.create({
        category: currentSign || (tokens[0]?.label ?? 'ASL_SEQUENCE'),
        text: displayText,
        score: currentConfidence ? Number(currentConfidence.toFixed(3)) : null,
        source,
        sessionId,
        tokens: tokens.map((t) => t.label),
        recognitionModel:
          mode === 'sign_language' ? 'asl_landmark_temporal' : 'mediapipe_generic',
        vocabularyId: mode === 'sign_language' ? 'asl_lexicon' : 'generic_gestures',
        aiAssisted: isAiAssisted,
      });

      setRecentSavedList((prev) => [record, ...prev.slice(0, 3)]);
      onRecordSaved?.(record);
      showToast('Translation saved', {
        type: 'success',
        message: `Saved to translation history.`,
      });
    } catch {
      const fallbackRecord: HistoryRecord = {
        id: Math.random().toString(36).substring(2, 9),
        category: currentSign || 'ASL_SEQUENCE',
        text: displayText,
        score: currentConfidence ? Number(currentConfidence.toFixed(3)) : null,
        source,
        sessionId,
        tokens: tokens.map((t) => t.label),
        recognitionModel: mode === 'sign_language' ? 'asl_landmark_temporal' : 'mediapipe_generic',
        vocabularyId: mode === 'sign_language' ? 'asl_lexicon' : 'generic_gestures',
        aiAssisted: isAiAssisted,
        createdAt: new Date().toISOString(),
      };
      queueOfflineRecord(fallbackRecord);
      setRecentSavedList((prev) => [fallbackRecord, ...prev.slice(0, 3)]);
      onRecordSaved?.(fallbackRecord);
      showToast('Saved to offline storage', { type: 'info' });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'sign_recognized':
        return <Badge variant="success">Sign Recognized</Badge>;
      case 'hand_detected':
        return <Badge variant="info">Hand Detected</Badge>;
      case 'recognizing':
        return <Badge variant="info">In Motion</Badge>;
      case 'uncertain_result':
        return <Badge variant="warning">Analyzing Posture</Badge>;
      case 'model_loading':
        return <Badge variant="warning">Loading Model</Badge>;
      case 'service_unavailable':
        return <Badge variant="error">Service Unavailable</Badge>;
      case 'no_hand':
      default:
        return <Badge variant="neutral">No Hand in Frame</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Primary Recognition Result Card */}
      <Card className="flex flex-col flex-1 shadow-card border-line">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-forest" />
            <h2 className="text-sm font-semibold text-ink">Real-Time Translation</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {getStatusBadge()}
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="mt-3 text-xs bg-page px-3 py-2 rounded-btn border border-line text-ink-secondary flex items-center justify-between">
          <span>Engine Status:</span>
          <span className="font-medium text-ink truncate ml-2">{statusMessage}</span>
        </div>

        {/* Real-time Currently Held Sign & Confidence */}
        <div className="mt-3 p-3 bg-card border border-line rounded-btn flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              Active Sign / Gesture
            </span>
            <p className="text-base font-bold text-ink mt-0.5">
              {currentSign ? (
                <span className="text-forest">{currentSign.replace(/^ASL_/, '').replace(/_/g, ' ')}</span>
              ) : (
                <span className="text-ink-muted font-normal text-sm italic">Waiting for stable sign...</span>
              )}
            </p>
          </div>

          {currentConfidence !== null && currentConfidence > 0 && (
            <div className="text-right">
              <span className="text-[11px] text-ink-secondary block">Model Confidence</span>
              <span className="text-sm font-extrabold text-forest">
                {(currentConfidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* Chronological Token Sequence Strip */}
        <div className="my-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-forest" />
              Chronological Signs ({tokens.length})
            </span>
            {tokens.length > 0 && (
              <button
                onClick={onUndoToken}
                className="text-xs text-ink-secondary hover:text-forest flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-page transition-colors"
                title="Undo last recognized token"
              >
                <Undo2 className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}
          </div>

          <div className="min-h-[44px] p-2 bg-page/70 rounded-btn border border-line flex flex-wrap gap-1.5 items-center">
            {tokens.length > 0 ? (
              tokens.map((token, idx) => (
                <span
                  key={token.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-card border border-line rounded-btn text-xs font-semibold text-ink shadow-2xs animate-in zoom-in-95 duration-150"
                >
                  <span className="text-forest text-[10px] font-mono">{idx + 1}.</span>
                  <span>{token.text}</span>
                  {token.confidence > 0 && (
                    <span className="text-[10px] text-ink-muted font-normal">
                      {(token.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink-muted italic pl-1">
                Signs recognized over time will accumulate here in sequence.
              </span>
            )}
          </div>
        </div>

        {/* Formatted Translated Sentence Area */}
        <div className="flex-1 flex flex-col justify-center p-4 bg-sage/30 rounded-card border border-forest/20 my-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-forest uppercase tracking-wider">
              Generated Script / Sentence
            </span>
            {isAiAssisted ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-forest bg-white/80 px-2 py-0.5 rounded-full border border-forest/20">
                <Bot className="w-3 h-3 text-forest" />
                AI Formatted ({aiProvider || 'Gemini'})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-secondary bg-white/80 px-2 py-0.5 rounded-full border border-line">
                Local Grammar Assembler
              </span>
            )}
          </div>

          <p className="text-xl sm:text-2xl font-bold text-ink tracking-tight mt-1 min-h-[3rem] flex items-center">
            {hasContent ? (
              displayText
            ) : (
              <span className="text-ink-muted text-base font-normal italic">
                Hold signs steady to construct words and sentences...
              </span>
            )}
          </p>
          {aiExplanation && (
            <p className="mt-3 text-xs leading-relaxed text-ink-secondary border-t border-forest/10 pt-2">
              {aiExplanation}
            </p>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-line mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!hasContent}
            leftIcon={copiedRecently ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copiedRecently ? 'Copied' : 'Copy'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSpeak}
            disabled={!hasContent}
            leftIcon={<Volume2 className="w-3.5 h-3.5" />}
          >
            Speak
          </Button>

          {onAiPolish && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAiPolish}
              disabled={tokens.length === 0 || isPolishing}
              isLoading={isPolishing}
              leftIcon={<Bot className="w-3.5 h-3.5 text-forest" />}
            >
              Generate Script
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSequence}
            disabled={!hasContent && tokens.length === 0}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-ink-muted" />}
          >
            Clear
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!hasContent || isSaving}
            isLoading={isSaving}
            leftIcon={<BookmarkPlus className="w-3.5 h-3.5" />}
          >
            Save
          </Button>
        </div>
      </Card>

      {/* Recent Translations in Session */}
      {recentSavedList.length > 0 && (
        <Card padding="sm" className="shadow-card border-line">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5 text-forest" />
            <span>Saved in this Session</span>
          </div>
          <div className="space-y-1.5">
            {recentSavedList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs p-2 rounded-btn bg-page border border-line"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-ink truncate">
                    {item.text}
                  </span>
                  {item.tokens && item.tokens.length > 0 && (
                    <span className="text-ink-muted text-[11px] truncate">
                      ({item.tokens.join(', ')})
                    </span>
                  )}
                </div>
                {item.score && (
                  <span className="text-forest font-semibold shrink-0 ml-2">
                    {(item.score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
