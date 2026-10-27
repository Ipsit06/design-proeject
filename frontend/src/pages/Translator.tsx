import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCamera } from '../features/camera/useCamera.js';
import { CameraPreview } from '../features/camera/CameraPreview.js';
import { useGestureRecognition } from '../features/recognition/useGestureRecognition.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { AVAILABLE_ADAPTERS } from '../features/recognition/adapters/index.js';
import { historyApi } from '../services/historyApi.js';
import { settingsApi } from '../services/settingsApi.js';
import { sessionsApi } from '../services/sessionsApi.js';
import type { AppSettings, RecognitionMode } from '@signbridge/shared';
import type { AdapterRecognitionResult } from '../features/recognition/adapters/types.js';
import {
  Volume2,
  VolumeX,
  Volume1,
  MousePointer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Delete,
  Space,
  Volume2 as SpeakIcon,
  CheckCircle,
  Layers,
  Sparkles,
  HandMetal,
  Radio,
  Save,
  ArrowUp,
  AlertTriangle,
} from 'lucide-react';

export const Translator: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    speechEnabled: true,
    speechRate: 1.0,
    confidenceThreshold: 0.65,
    autoSpeak: false,
    recognitionMode: 'harshil_asl',
    aiAssistanceEnabled: true,
    holdTimeMs: 350,
  });

  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>('harshil_asl');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ASL Writing Mode state (Harshil asl_model)
  const [detectedWord, setDetectedWord] = useState<string>('');
  const [aslStableCount, setAslStableCount] = useState<number>(0);
  const prevAslLetterRef = useRef<string | null>(null);
  const stableCountRef = useRef<number>(0);
  const lastAslCommitTimeRef = useRef<number>(0);

  // HCI Mode state (Harshil gesture_model)
  const [hciModeState, setHciModeState] = useState<'idle' | 'tracking' | 'zoom'>('idle');
  const [volumeLevel, setVolumeLevel] = useState<number>(60);
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [virtualCursor, setVirtualCursor] = useState<{ x: number; y: number } | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string>('Ready for gesture input');
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number; type: 'left' | 'right' } | null>(null);
  const lastHciActionTimeRef = useRef<number>(0);
  const prevPinchDistRef = useRef<number | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { state: cameraState, videoRef, startCamera, stopCamera } = useCamera();

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const sData = await settingsApi.get();
        setSettings(sData);
      } catch (e) {
        console.warn('[Translator] Failed to load settings:', e);
      }
    }
    loadSettings();
  }, []);

  // Play audio chime for volume feedback
  const playBeep = useCallback((freq = 520) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {}
  }, []);

  // Text to speech
  const speakWord = useCallback((textToSpeak?: string) => {
    const text = textToSpeak ?? detectedWord;
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.speechRate || 1.0;
    window.speechSynthesis.speak(utterance);
  }, [detectedWord, settings.speechRate]);

  // Session lifecycle
  const handleStartCamera = useCallback(async () => {
    await startCamera();
    try {
      const session = await sessionsApi.start('live');
      setSessionId(session.id);
    } catch {
      setSessionId(null);
    }
  }, [startCamera]);

  const handleStopCamera = useCallback(() => {
    stopCamera();
    setVirtualCursor(null);
    setClickRipple(null);
    if (sessionIdRef.current) {
      sessionsApi.end(sessionIdRef.current).catch(() => {});
      setSessionId(null);
    }
  }, [stopCamera]);

  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        sessionsApi.end(sessionIdRef.current).catch(() => {});
      }
    };
  }, []);

  // Continuous frame listener for HCI actions and cursor tracking
  const handleMotionFrame = useCallback((frame: { timestamp: number; landmarks: any[][]; handedness: string[] }) => {
    if (!frame.landmarks || frame.landmarks.length === 0 || frame.landmarks[0].length < 21) {
      return;
    }

    const hand = frame.landmarks[0];
    const now = performance.now();

    // 1. If in HCI Tracking Mode: update virtual cursor with index fingertip (landmark 8)
    if (hciModeState === 'tracking') {
      const indexTip = hand[8];
      // Flip X for mirror video effect
      const cursorX = Math.round((1 - indexTip.x) * 100);
      const cursorY = Math.round(indexTip.y * 100);
      setVirtualCursor({ x: cursorX, y: cursorY });
    }

    // 2. If in HCI Zoom Mode: pinch distance between thumb (4) and index (8)
    if (hciModeState === 'zoom') {
      const thumb = hand[4];
      const indexTip = hand[8];
      const dx = thumb.x - indexTip.x;
      const dy = thumb.y - indexTip.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (prevPinchDistRef.current !== null) {
        const delta = dist - prevPinchDistRef.current;
        if (Math.abs(delta) > 0.015) {
          if (delta > 0) {
            setZoomScale((z) => Math.min(180, z + 5));
            setLastActionMessage('Zoom In (+)');
          } else {
            setZoomScale((z) => Math.max(70, z - 5));
            setLastActionMessage('Zoom Out (-)');
          }
        }
      }
      prevPinchDistRef.current = dist;
    }
  }, [hciModeState]);

  // Handle recognized sign / gesture from model adapter
  const handleSignRecognized = useCallback((result: AdapterRecognitionResult) => {
    const now = performance.now();

    // ==========================================
    // A. ASL WRITING MODE (Harshil ASL Model)
    // ==========================================
    if (recognitionMode === 'harshil_asl') {
      const letter = result.label.toUpperCase();

      if (letter === prevAslLetterRef.current) {
        stableCountRef.current++;
      } else {
        prevAslLetterRef.current = letter;
        stableCountRef.current = 1;
      }
      setAslStableCount(stableCountRef.current);

      // Harshil STABLE_THRESHOLD = 5 frames to commit letter
      if (
        stableCountRef.current >= 5 &&
        result.confidence >= 0.75 &&
        now - lastAslCommitTimeRef.current > 1200
      ) {
        setDetectedWord((prev) => prev + letter);
        lastAslCommitTimeRef.current = now;
        stableCountRef.current = 0;
        setAslStableCount(0);
        playBeep(640);

        if (settings.autoSpeak) {
          speakWord(letter);
        }
      }
    }

    // ==========================================
    // B. HCI GESTURE CONTROL MODE (Harshil Gesture Model)
    // ==========================================
    else if (recognitionMode === 'harshil_hci') {
      const gesture = result.label.toLowerCase();

      // Check action cooldown
      if (now - lastHciActionTimeRef.current < 800) {
        return;
      }

      // Mode toggles
      if (gesture === 'two_fingers') {
        setHciModeState('tracking');
        setLastActionMessage('Tracking Mode ENABLED — Index finger controls cursor');
        playBeep(700);
        lastHciActionTimeRef.current = now;
      } else if (gesture === 'victory') {
        setHciModeState('zoom');
        setLastActionMessage('Zoom Mode ENABLED — Pinch fingers to zoom in/out');
        playBeep(750);
        lastHciActionTimeRef.current = now;
      } else if (gesture === 'fist') {
        setHciModeState('idle');
        setVirtualCursor(null);
        setLastActionMessage('Idle / Tracking DISABLED');
        playBeep(400);
        lastHciActionTimeRef.current = now;
      }
      // Actions
      else if (gesture === 'thumbs_up') {
        setVolumeLevel((v) => Math.min(100, v + 10));
        setLastActionMessage('Volume Up (+10%)');
        playBeep(880);
        lastHciActionTimeRef.current = now;
      } else if (gesture === 'thumbs_down') {
        setVolumeLevel((v) => Math.max(0, v - 10));
        setLastActionMessage('Volume Down (-10%)');
        playBeep(330);
        lastHciActionTimeRef.current = now;
      } else if (gesture === 'open_palm') {
        setLastActionMessage('Scroll Up');
        window.scrollBy({ top: -180, behavior: 'smooth' });
        playBeep(520);
        lastHciActionTimeRef.current = now;
      } else if (gesture === 'pinch') {
        setLastActionMessage('Left Click executed');
        setClickRipple({ x: virtualCursor?.x ?? 50, y: virtualCursor?.y ?? 50, type: 'left' });
        setTimeout(() => setClickRipple(null), 600);
        playBeep(920);
        lastHciActionTimeRef.current = now;
      } else if (gesture === 'ok_sign') {
        setLastActionMessage('Right Click executed');
        setClickRipple({ x: virtualCursor?.x ?? 50, y: virtualCursor?.y ?? 50, type: 'right' });
        setTimeout(() => setClickRipple(null), 600);
        playBeep(480);
        lastHciActionTimeRef.current = now;
      } else if (gesture === 'pointing') {
        setLastActionMessage('Pointing gesture active');
      }
    }
  }, [recognitionMode, settings.autoSpeak, speakWord, playBeep, virtualCursor]);

  // Word Buffer Controls (Harshil ASL Writing Mode)
  const handleAddSpace = () => {
    setDetectedWord((prev) => prev + ' ');
  };

  const handleDeleteLastLetter = () => {
    setDetectedWord((prev) => prev.slice(0, -1));
  };

  const handleClearWord = () => {
    setDetectedWord('');
    prevAslLetterRef.current = null;
    stableCountRef.current = 0;
    setAslStableCount(0);
  };

  const handleSaveToHistory = async () => {
    if (!detectedWord.trim()) return;
    try {
      await historyApi.create({
        category: 'ASL_WRITING',
        text: detectedWord.trim(),
        score: liveResult?.confidence ?? 0.95,
        source: 'live',
        sessionId,
        recognitionModel: 'harshil_asl_model',
      });
      setLastActionMessage(`Saved "${detectedWord.trim()}" to history`);
    } catch (e) {
      console.warn('Failed to save history:', e);
    }
  };

  // Main recognition hook
  const {
    recognizerReady,
    status: liveStatus,
    statusMessage: liveStatusMessage,
    currentResult: liveResult,
    qualityResult,
    clearResult: clearLiveResult,
  } = useGestureRecognition({
    videoRef,
    canvasRef,
    isStreaming: cameraState.isStreaming,
    mode: recognitionMode,
    confidenceThreshold: settings.confidenceThreshold,
    holdTimeMs: settings.holdTimeMs || 350,
    onSignRecognized: handleSignRecognized,
    onMotionFrame: handleMotionFrame,
    enableClassification: true,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hand Gesture Studio — HCI + ASL Writing"
        description="Real-time hand gesture recognition powered by Harshil's trained neural network models for Human-Computer Interaction and ASL writing."
      />

      {/* Model Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-card border border-line rounded-card shadow-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-forest shrink-0" />
          <span className="text-xs font-bold text-ink uppercase tracking-wider">
            Active Studio Mode:
          </span>
        </div>

        <div className="flex flex-wrap rounded-btn border border-line overflow-hidden bg-page text-xs font-medium">
          {AVAILABLE_ADAPTERS.map((adapter) => {
            const isSelected = recognitionMode === adapter.mode;
            return (
              <button
                key={adapter.id}
                onClick={() => {
                  setRecognitionMode(adapter.mode);
                  setHciModeState('idle');
                  setVirtualCursor(null);
                  prevAslLetterRef.current = null;
                  stableCountRef.current = 0;
                  setAslStableCount(0);
                }}
                className={`px-3 py-2 flex items-center gap-1.5 transition-colors ${
                  isSelected
                    ? 'bg-forest text-white font-semibold shadow-xs'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                <span>{adapter.name}</span>
                {adapter.isGenuineSignLanguage && (
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-semibold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-sage text-forest'
                    }`}
                  >
                    ASL
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Specific Banners & Status */}
      {recognitionMode === 'harshil_asl' && (
        <div className="p-4 rounded-card border border-forest/30 bg-gradient-to-r from-sage/50 via-card to-card flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center font-bold text-base shadow-sm">
              ASL
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">ASL Writing Mode (Harshil ASL Model)</h3>
              <p className="text-xs text-ink-secondary">
                Recognizes all 26 ASL alphabet letters (A–Z). Hold a letter for 5 frames to append to the Word buffer.
              </p>
            </div>
          </div>
          {liveResult && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-btn border border-line text-xs font-semibold text-forest shadow-xs">
              <span>Candidate:</span>
              <span className="text-base font-bold text-ink">{liveResult.label}</span>
              <span className="text-ink-secondary">({(liveResult.confidence * 100).toFixed(0)}%)</span>
              <span className="text-[11px] text-forest/80 font-normal">[{aslStableCount}/5 hold]</span>
            </div>
          )}
        </div>
      )}

      {recognitionMode === 'harshil_hci' && (
        <div className="p-4 rounded-card border border-purple-200 bg-gradient-to-r from-purple-50 via-card to-card flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              HCI
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">HCI Gesture Control Studio (Harshil Gesture Model)</h3>
              <p className="text-xs text-ink-secondary">
                9 Actions: Thumbs Up (Vol+), Thumbs Down (Vol-), Open Palm (Scroll), Two Fingers (Tracking), Victory (Zoom), Pinch (Click).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                hciModeState === 'tracking'
                  ? 'bg-blue-600 text-white animate-pulse'
                  : hciModeState === 'zoom'
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              Mode: {hciModeState}
            </span>
          </div>
        </div>
      )}

      {/* Main Two-Column Translator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera Preview + Virtual Cursor / Zoom scaling */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div
            className="relative rounded-card overflow-hidden border border-line shadow-card transition-transform duration-200"
            style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: 'center center' }}
          >
            <CameraPreview
              videoRef={videoRef}
              canvasRef={canvasRef}
              cameraState={cameraState}
              onStart={handleStartCamera}
              onStop={handleStopCamera}
              onRetry={handleStartCamera}
            />

            {/* Virtual Cursor Overlay in HCI Tracking Mode */}
            {cameraState.isStreaming && hciModeState === 'tracking' && virtualCursor && (
              <div
                className="absolute pointer-events-none transition-all duration-75 z-30"
                style={{
                  left: `${virtualCursor.x}%`,
                  top: `${virtualCursor.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="relative">
                  <MousePointer className="w-7 h-7 text-blue-500 fill-blue-500 drop-shadow-md animate-bounce" />
                  <span className="absolute left-6 -top-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                    Cursor
                  </span>
                </div>
              </div>
            )}

            {/* Click Ripple Indicator */}
            {clickRipple && (
              <div
                className="absolute pointer-events-none z-40 transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${clickRipple.x}%`, top: `${clickRipple.y}%` }}
              >
                <div
                  className={`w-12 h-12 rounded-full border-4 animate-ping ${
                    clickRipple.type === 'left' ? 'border-green-400 bg-green-400/20' : 'border-purple-400 bg-purple-400/20'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Real-time Quality Guidance Chips */}
          {qualityResult && qualityResult.issues.length > 0 && cameraState.isStreaming && (
            <div className="flex flex-wrap gap-2">
              {qualityResult.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs bg-amber-50 border border-amber-200 text-amber-900 font-medium shadow-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Mode Controls & Interactive HUD */}
        <div className="lg:col-span-5 space-y-4">
          {/* ======================================================== */}
          {/* ASL WRITING MODE PANEL (Harshil ASL Model)               */}
          {/* ======================================================== */}
          {recognitionMode === 'harshil_asl' && (
            <div className="rounded-card border border-line bg-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
                    Detected Word Buffer
                  </h3>
                  <p className="text-xs text-ink-secondary">
                    Letters are stabilized and appended automatically.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearWord}
                  disabled={!detectedWord}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Clear
                </Button>
              </div>

              {/* Word Display Box */}
              <div className="p-4 rounded-btn border border-line bg-surface-alt min-h-[90px] flex flex-col justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                  Word:
                </span>
                <p className="text-3xl font-extrabold text-ink font-mono tracking-wider break-words mt-1">
                  {detectedWord || <span className="text-ink-secondary font-normal text-lg">Start camera and sign letters (A-Z)...</span>}
                </p>
              </div>

              {/* Action Buttons: Space, Delete, Speak, Save */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAddSpace}
                  leftIcon={<Space className="w-4 h-4" />}
                  className="w-full justify-center"
                >
                  Space
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDeleteLastLetter}
                  disabled={!detectedWord}
                  leftIcon={<Delete className="w-4 h-4" />}
                  className="w-full justify-center"
                >
                  Delete Letter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => speakWord()}
                  disabled={!detectedWord}
                  leftIcon={<SpeakIcon className="w-4 h-4 text-forest" />}
                  className="w-full justify-center"
                >
                  Speak Word
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveToHistory}
                  disabled={!detectedWord}
                  leftIcon={<Save className="w-4 h-4" />}
                  className="w-full justify-center"
                >
                  Save Word
                </Button>
              </div>

              {/* Harshil Model Info Box */}
              <div className="p-3 bg-sage/40 rounded-btn border border-forest/20 text-xs text-ink-secondary space-y-1">
                <div className="font-semibold text-forest flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Harshil ASL Model Active
                </div>
                <p>
                  Features: 21 Landmarks $\rightarrow$ Wrist Relative $\rightarrow$ Max Absolute Normalization (63 floats) $\rightarrow$ 3-Layer Dense Neural Net (256-128-26).
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* HCI GESTURE CONTROL STUDIO PANEL (Harshil Gesture Model)  */}
          {/* ======================================================== */}
          {recognitionMode === 'harshil_hci' && (
            <div className="rounded-card border border-line bg-card p-5 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
                    Interactive HCI Action Studio
                  </h3>
                  <p className="text-xs text-ink-secondary">
                    Live device & UI actions triggered by your hand gestures.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  9 Gestures Active
                </span>
              </div>

              {/* Status Action Feedback Banner */}
              <div className="p-3 rounded-btn bg-purple-50 border border-purple-200 text-purple-900 flex items-center gap-3">
                <Radio className="w-5 h-5 text-purple-600 shrink-0 animate-pulse" />
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase text-purple-700">Latest Action</div>
                  <div className="text-sm font-bold">{lastActionMessage}</div>
                </div>
              </div>

              {/* Volume Controller Simulation */}
              <div className="p-3.5 rounded-btn border border-line bg-surface-alt space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-ink">
                  <span className="flex items-center gap-1.5">
                    {volumeLevel > 0 ? <Volume2 className="w-4 h-4 text-forest" /> : <VolumeX className="w-4 h-4 text-ink-secondary" />}
                    Simulated System Volume (Thumbs Up / Down)
                  </span>
                  <span className="font-mono">{volumeLevel}%</span>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-forest h-full transition-all duration-300 rounded-full"
                    style={{ width: `${volumeLevel}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-ink-secondary">
                  <span>👍 Thumbs Up (+10%)</span>
                  <span>👎 Thumbs Down (-10%)</span>
                </div>
              </div>

              {/* Zoom Scale Controller Simulation */}
              <div className="p-3.5 rounded-btn border border-line bg-surface-alt space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-ink">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-4 h-4 text-amber-600" />
                    Camera Viewport Zoom (Victory + Pinch Distance)
                  </span>
                  <span className="font-mono">{zoomScale}%</span>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all duration-200 rounded-full"
                    style={{ width: `${((zoomScale - 70) / 110) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-ink-secondary">
                  <span>✌️ Victory (Activates Zoom Mode)</span>
                  <button onClick={() => setZoomScale(100)} className="underline hover:text-ink">
                    Reset (100%)
                  </button>
                </div>
              </div>

              {/* Mouse Cursor Tracking & Clicks Legend */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-btn border border-line bg-surface-alt">
                  <div className="font-bold text-ink flex items-center gap-1">
                    <MousePointer className="w-3.5 h-3.5 text-blue-600" /> Two Fingers
                  </div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">
                    Enables tracking; index fingertip drives cursor
                  </div>
                </div>
                <div className="p-2.5 rounded-btn border border-line bg-surface-alt">
                  <div className="font-bold text-ink flex items-center gap-1">
                    <ArrowUp className="w-3.5 h-3.5 text-forest" /> Open Palm
                  </div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">
                    Triggers page scroll upward
                  </div>
                </div>
                <div className="p-2.5 rounded-btn border border-line bg-surface-alt">
                  <div className="font-bold text-ink">👌 Pinch / OK Sign</div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">
                    Left Click (Pinch) & Right Click (OK Sign)
                  </div>
                </div>
                <div className="p-2.5 rounded-btn border border-line bg-surface-alt">
                  <div className="font-bold text-ink">✊ Fist</div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">
                    Deactivate / Return to Idle
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Model Status Card */}
          <div className="rounded-card border border-line bg-card px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">Engine Status</span>
              <span className="rounded-full bg-sage px-2.5 py-0.5 text-xs font-semibold text-forest">
                {recognizerReady ? 'Neural Net Active' : 'Loading MediaPipe...'}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-secondary">{liveStatusMessage}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Translator;
