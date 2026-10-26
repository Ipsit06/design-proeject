import React from 'react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { AlertTriangle, HandMetal, Sparkles } from 'lucide-react';
import type { GestureMapping, RecognitionMode } from '@signbridge/shared';

interface DemoModeProps {
  gestures: GestureMapping[];
  activeMode: RecognitionMode;
  onSelectSign: (category: string, text: string, confidence: number) => void;
  activeCategory: string | null;
}

const SAMPLE_ASL_DEMO_SIGNS = [
  { category: 'ASL_HELLO', text: 'Hello', label: 'Hello', type: 'Conversational Sign', confidence: 0.94 },
  { category: 'ASL_THANK_YOU', text: 'Thank you', label: 'Thank You', type: 'Conversational Sign', confidence: 0.92 },
  { category: 'ASL_YES', text: 'Yes', label: 'Yes', type: 'Affirmation Sign', confidence: 0.90 },
  { category: 'ASL_NO', text: 'No', label: 'No', type: 'Negation Sign', confidence: 0.91 },
  { category: 'ASL_A', text: 'A', label: 'Letter A', type: 'ASL Fingerspelling', confidence: 0.93 },
  { category: 'ASL_B', text: 'B', label: 'Letter B', type: 'ASL Fingerspelling', confidence: 0.95 },
  { category: 'ASL_C', text: 'C', label: 'Letter C', type: 'ASL Fingerspelling', confidence: 0.88 },
  { category: 'ASL_L', text: 'L', label: 'Letter L', type: 'ASL Fingerspelling', confidence: 0.96 },
  { category: 'ASL_V', text: 'V', label: 'Letter V', type: 'ASL Fingerspelling', confidence: 0.94 },
  { category: 'ASL_Y', text: 'Y', label: 'Letter Y', type: 'ASL Fingerspelling', confidence: 0.92 },
];

const SAMPLE_GENERIC_GESTURES = [
  { category: 'Open_Palm', text: 'Open Palm', label: 'Open Palm', type: 'Generic Posture', confidence: 0.95 },
  { category: 'Closed_Fist', text: 'Closed Fist', label: 'Closed Fist', type: 'Generic Posture', confidence: 0.93 },
  { category: 'Thumb_Up', text: 'Thumbs Up', label: 'Thumbs Up', type: 'Generic Posture', confidence: 0.96 },
  { category: 'Victory', text: 'Peace Sign', label: 'Victory / Peace', type: 'Generic Posture', confidence: 0.92 },
  { category: 'ILoveYou', text: 'I Love You', label: 'I Love You', type: 'Generic Gesture', confidence: 0.94 },
];

export const DemoMode: React.FC<DemoModeProps> = ({
  activeMode,
  onSelectSign,
  activeCategory,
}) => {
  const sampleList =
    activeMode === 'sign_language' ? SAMPLE_ASL_DEMO_SIGNS : SAMPLE_GENERIC_GESTURES;

  return (
    <Card className="border-status-warning/40 bg-status-warningBg/20 space-y-4">
      {/* Prominent Demo Notice */}
      <div className="flex items-center justify-between pb-3 border-b border-status-warning/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-status-warning" />
          <div>
            <h3 className="text-sm font-bold text-ink">
              DEMO MODE — Simulated Input
            </h3>
            <p className="text-xs text-status-warning font-medium">
              Hardware simulation for testing without webcam. Saved translations are tagged as 'demo'.
            </p>
          </div>
        </div>
        <Badge variant="warning">Simulated</Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-ink uppercase tracking-wider">
            Select {activeMode === 'sign_language' ? 'ASL Sign or Letter' : 'Generic Gesture'}:
          </p>
          <span className="text-[11px] text-ink-secondary">
            Mode: <strong>{activeMode === 'sign_language' ? 'ASL Sign Language' : 'MediaPipe Generic'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {sampleList.map((item) => {
            const isSelected = activeCategory === item.category;
            return (
              <button
                key={item.category}
                onClick={() => onSelectSign(item.category, item.text, item.confidence)}
                className={`p-2.5 text-left rounded-btn border transition-all ${
                  isSelected
                    ? 'border-status-warning bg-card shadow-sm ring-2 ring-status-warning/50'
                    : 'border-line bg-card/90 hover:bg-card hover:border-ink-muted'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <HandMetal className="w-3.5 h-3.5 text-forest" />
                  <span className="text-[10px] font-mono text-ink-muted">
                    {(item.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs font-bold text-ink truncate">{item.label}</div>
                <div className="text-[10px] text-ink-secondary mt-0.5 line-clamp-1">
                  {item.type}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
