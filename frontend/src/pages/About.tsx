import React from 'react';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import {
  Code2,
  Cpu,
  Layers,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Database,
  CheckCircle2,
  Clock,
  Compass,
  Bot,
  ShieldCheck,
} from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title="About SignBridge"
        description="Comprehensive architecture specifications, multi-layer recognition pipeline, and viva presentation documentation."
      />

      {/* 1. Problem Statement */}
      <Card className="border-line">
        <h2 className="text-base font-bold text-ink flex items-center gap-2 mb-2">
          <Compass className="w-5 h-5 text-forest" />
          Problem Statement
        </h2>
        <blockquote className="p-4 bg-sage/50 border-l-4 border-forest rounded-r text-sm text-ink leading-relaxed italic">
          &ldquo;Communication between sign-language users and people unfamiliar with sign language can be challenging. SignBridge explores whether computer vision can provide an accessible way to recognize selected hand gestures and present corresponding text and speech.&rdquo;
        </blockquote>
      </Card>

      {/* 2. Six-Layer Modular Recognition Architecture */}
      <Card className="border-line space-y-4">
        <h2 className="text-base font-bold text-ink flex items-center gap-2">
          <Layers className="w-5 h-5 text-forest" />
          Six-Layer Modular Recognition Architecture
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-3.5 bg-page rounded-card border border-line space-y-1.5">
            <span className="font-bold text-forest">Layer 1: Camera Capture</span>
            <p className="text-ink-secondary leading-relaxed">
              Continuous webcam capture initiated only upon explicit user consent via browser MediaStream API. Strict cleanup on unmount and navigation.
            </p>
          </div>

          <div className="p-3.5 bg-page rounded-card border border-line space-y-1.5">
            <span className="font-bold text-forest">Layer 2: 3D Landmark Extraction</span>
            <p className="text-ink-secondary leading-relaxed">
              MediaPipe Tasks Vision extracts 21 3D joint coordinates for single or dual hands entirely on-device via WebAssembly. Video never leaves the machine.
            </p>
          </div>

          <div className="p-3.5 bg-page rounded-card border border-line space-y-1.5">
            <span className="font-bold text-forest">Layer 3: Temporal Motion Buffer</span>
            <p className="text-ink-secondary leading-relaxed">
              Sliding frame sequence window tracking joint velocities. Distinguishes fast transitional movement from stable signing holds (&ge; 350 ms).
            </p>
          </div>

          <div className="p-3.5 bg-page rounded-card border border-line space-y-1.5">
            <span className="font-bold text-forest">Layer 4: Sign Vocabulary Interpretation</span>
            <p className="text-ink-secondary leading-relaxed">
              Model adapter architecture separating genuine American Sign Language (ASL) manual letters and words from generic gesture baselines.
            </p>
          </div>

          <div className="p-3.5 bg-page rounded-card border border-line space-y-1.5">
            <span className="font-bold text-forest">Layer 5: Sentence Construction & AI Assistance</span>
            <p className="text-ink-secondary leading-relaxed">
              Chronological token assembly with duplicate suppression. Optional server-side LLM formatting formats sign tokens into fluent English.
            </p>
          </div>

          <div className="p-3.5 bg-page rounded-card border border-line space-y-1.5">
            <span className="font-bold text-forest">Layer 6: Text, Speech & Stored Analytics</span>
            <p className="text-ink-secondary leading-relaxed">
              Web Speech synthesis and persistent REST API logging. Metrics reflect genuine database entries with zero fabricated numbers.
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Model Adapter Architecture */}
      <Card className="border-line space-y-3">
        <h2 className="text-base font-bold text-ink flex items-center gap-2">
          <Cpu className="w-5 h-5 text-forest" />
          Model Adapter Interface
        </h2>
        <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
          SignBridge employs a modular adapter interface (<code>RecognitionAdapter</code>) ensuring new machine learning models and language vocabularies can be plugged in without refactoring UI layers:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-3.5 bg-sage/30 rounded-btn border border-forest/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-forest">Harshil ASL Writing Model (asl_model.h5)</span>
              <Badge variant="success">26 Letters A–Z</Badge>
            </div>
            <p className="text-ink-secondary text-xs leading-relaxed">
              3-Layer Dense Neural Network (256-128-26) trained on 63 normalized landmark features (wrist-relative + max-absolute scaling). Enables letter stabilization (5-frame hold) and continuous word composition.
            </p>
          </div>

          <div className="p-3.5 bg-purple-50/60 rounded-btn border border-purple-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-purple-900">Harshil HCI Gesture Model (gesture_model.h5)</span>
              <Badge variant="neutral">9 HCI Actions</Badge>
            </div>
            <p className="text-ink-secondary text-xs leading-relaxed">
              Trained classifier for Human-Computer Interaction: Volume Up/Down (thumbs up/down), Page Scroll (open palm), Virtual Cursor Tracking (two fingers), Zoom Mode (victory/pinch), and Left/Right Click (pinch/ok sign).
            </p>
          </div>
        </div>
      </Card>

      {/* 4. AI Language Model Assistance */}
      <Card className="border-line space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Bot className="w-5 h-5 text-forest" />
            AI Language-Model Assistance (Optional)
          </h2>
          <Badge variant="info">Secure Server Proxy</Badge>
        </div>
        <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
          When configured via the server-side environment variable <code>GEMINI_API_KEY</code>, SignBridge securely consults Google Gemini to interpret raw signed token sequences into fluent sentences.
        </p>
        <ul className="space-y-1.5 text-xs text-ink-secondary list-disc pl-4 leading-relaxed">
          <li><strong>Zero Camera Uploads:</strong> Camera frames never leave the user's browser. Only verified, recognized text tokens are sent to the backend.</li>
          <li><strong>No Hallucinations:</strong> The LLM is strictly constrained to structure only the signs actually produced.</li>
          <li><strong>Graceful Fallback:</strong> If no API key is set or the network is unavailable, an intelligent local rule-based linguistic assembler formats the sentence automatically.</li>
        </ul>
      </Card>

      {/* 5. Implementation Status Matrix */}
      <Card className="border-line">
        <h2 className="text-base font-bold text-ink flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-status-success" />
          Implementation Status Matrix (Honest Assessment)
        </h2>
        <div className="divide-y divide-line text-xs sm:text-sm">
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink">Continuous Dual-Hand Landmark Extraction</p>
              <p className="text-ink-secondary text-xs">MediaPipe Tasks Vision on-device WebAssembly pipeline</p>
            </div>
            <Badge variant="success">Completed</Badge>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink">Rolling Temporal Motion & Velocity Buffer</p>
              <p className="text-ink-secondary text-xs">Sliding window velocity calculation and hold duration confirmation</p>
            </div>
            <Badge variant="success">Completed</Badge>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink">ASL Manual Alphabet & Conversational Classifier</p>
              <p className="text-ink-secondary text-xs">3D biometric geometry invariants and canonical angle prototype matching</p>
            </div>
            <Badge variant="success">Completed</Badge>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink">Chronological Sign Sequence Assembly</p>
              <p className="text-ink-secondary text-xs">Token accumulation, pause detection, undo, and distinct raw vs polished sentence area</p>
            </div>
            <Badge variant="success">Completed</Badge>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink">Server-Side LLM Assistance & Local Rule Assembler</p>
              <p className="text-ink-secondary text-xs">Gemini API integration with local heuristic fallback</p>
            </div>
            <Badge variant="success">Completed</Badge>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink">Continuous Full-Sentence Dynamic Translation</p>
              <p className="text-ink-secondary text-xs">Requires multi-modal transformer networks trained on continuous video corpora</p>
            </div>
            <Badge variant="neutral">Planned (Future Scope)</Badge>
          </div>
        </div>
      </Card>

      {/* 6. Honest Limitations & Current System Boundaries (v2) */}
      <Card className="border-line bg-card space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Current System Boundaries & Limitations (v2)
          </h2>
          <Badge variant="warning">Honest Assessment</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-3.5 bg-surface-alt rounded-card border border-line space-y-1">
            <span className="font-bold text-ink">1. Vocabulary Scale</span>
            <p className="text-ink-secondary leading-relaxed">
              Supports user-trained vocabularies (typically 5–30 signs) and standard ASL fingerspelling / basic signs. Does not support the 10,000+ signs of full natural signed languages.
            </p>
          </div>

          <div className="p-3.5 bg-surface-alt rounded-card border border-line space-y-1">
            <span className="font-bold text-ink">2. Sign-Language Specificity</span>
            <p className="text-ink-secondary leading-relaxed">
              Signs are language-specific. A model trained on ASL does not translate Indian Sign Language (ISL) or British Sign Language (BSL). Regional dialects exist within every signed language.
            </p>
          </div>

          <div className="p-3.5 bg-surface-alt rounded-card border border-line space-y-1">
            <span className="font-bold text-ink">3. Grammar and Continuous Signing</span>
            <p className="text-ink-secondary leading-relaxed">
              Translates isolated signs and simple signed phrases with pause boundaries. Full signed languages use spatial grammar, topicalization, and simultaneous non-manual signals that this prototype only partially models.
            </p>
          </div>

          <div className="p-3.5 bg-surface-alt rounded-card border border-line space-y-1">
            <span className="font-bold text-ink">4. Non-Manual Markers</span>
            <p className="text-ink-secondary leading-relaxed">
              Experimental facial-expression cues (eyebrows, mouth open) detect basic question forms. Full sign language facial grammar (wh-questions, negation, intensity) requires dedicated training.
            </p>
          </div>

          <div className="p-3.5 bg-surface-alt rounded-card border border-line space-y-1">
            <span className="font-bold text-ink">5. Lighting and Background</span>
            <p className="text-ink-secondary leading-relaxed">
              Real-time quality checks alert users to dim light, backlight, and hand clipping. In ideal conditions, accuracy reaches the reported benchmark; extreme conditions degrade performance.
            </p>
          </div>

          <div className="p-3.5 bg-surface-alt rounded-card border border-line space-y-1">
            <span className="font-bold text-ink">6. Validation Status</span>
            <p className="text-ink-secondary leading-relaxed">
              Custom signs trained in-app are marked <strong>Unvalidated</strong> until reviewed by a fluent or native signer.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default About;
