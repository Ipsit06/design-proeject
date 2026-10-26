import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCamera } from '../features/camera/useCamera.js';
import { CameraPreview } from '../features/camera/CameraPreview.js';
import { useGestureRecognition } from '../features/recognition/useGestureRecognition.js';
import { SequenceManager, type RecognizedToken } from '../features/translation/sequenceManager.js';
import { settingsApi } from '../services/settingsApi.js';
import { sessionsApi } from '../services/sessionsApi.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { useFaceCues } from '../features/face/useFaceCues.js';
import { Bot, HandMetal, AlertTriangle, Smile } from 'lucide-react';
import type { AppSettings, RecognitionMode } from '@signbridge/shared';
import { apiRequest } from '../services/apiClient.js';
import type { AdapterRecognitionResult } from '../features/recognition/adapters/types.js';

export const Translator: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    speechEnabled: true,
    speechRate: 1.0,
    confidenceThreshold: 0.65,
    autoSpeak: false,
    recognitionMode: 'sign_language',
    aiAssistanceEnabled: true,
    holdTimeMs: 350,
  });

  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>('sanket_video');
  const [faceCuesEnabled, setFaceCuesEnabled] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Chronological Sequence State
  const sequenceManagerRef = useRef<SequenceManager>(new SequenceManager());
  const [tokens, setTokens] = useState<RecognizedToken[]>([]);
  const [sentenceText, setSentenceText] = useState<string>('');
  const [sanketStatus, setSanketStatus] = useState('Ready for an ISL video clip.');
  const [sanketError, setSanketError] = useState<string | null>(null);
  const sanketBusyRef = useRef(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { state: cameraState, videoRef, startCamera, stopCamera } = useCamera();

  // Load backend gestures and settings on mount
  useEffect(() => {
    async function loadData() {
      try {
        const sData = await settingsApi.get();
        setSettings(sData);
        if (sData.recognitionMode) {
          setRecognitionMode('sanket_video');
        }
      } catch (e) {
        console.warn('[Translator] Failed to load gestures/settings:', e);
      }
    }
    loadData();
  }, []);

  // Handle Session lifecycle: start on streaming, end on stop
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
    sequenceManagerRef.current.clear();
    setTokens([]);
    setSentenceText('');
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

  // Token Append Callback from Real Recognition Loop
  const handleSignRecognized = useCallback((result: AdapterRecognitionResult) => {
    const added = sequenceManagerRef.current.addToken({
      label: result.label,
      text: result.mappedText,
      confidence: result.confidence,
      timestamp: Date.now(),
      mode: result.mode,
    });

    if (added) {
      const updatedTokens = sequenceManagerRef.current.getTokens();
      setTokens(updatedTokens);
      setSentenceText(sequenceManagerRef.current.getRawSentence());
    }
  }, []);

  const translateSanketVideo = useCallback(async (videoData: string) => {
    if (sanketBusyRef.current) return;
    sanketBusyRef.current = true;
    setSanketStatus('Sanket is analyzing the video clip...');
    setSanketError(null);
    try {
      const result = await apiRequest<{
        status: 'recognized' | 'uncertain' | 'error';
        translation: string;
        error?: string;
      }>('/sanket/translate', {
        method: 'POST',
        body: JSON.stringify({ videoData }),
      });
      if (result.status === 'recognized' && result.translation.trim()) {
        const text = result.translation.trim();
        setSentenceText(text);
        setTokens([{ id: `sanket-${Date.now()}`, label: 'Sanket clip', text, confidence: 1, timestamp: Date.now(), mode: 'sanket_video' }]);
        setSanketStatus('Sanket translation verified.');
      } else {
        setSanketStatus('Sanket could not verify a sign in this clip.');
        setSanketError(result.error || 'Record a clearer 2–4 second ISL clip.');
      }
    } catch (error) {
      setSanketStatus('Sanket inference is unavailable.');
      setSanketError(error instanceof Error ? error.message : 'Sanket request failed.');
    } finally {
      sanketBusyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!cameraState.isStreaming || !videoRef.current?.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    if (!window.MediaRecorder || !stream) {
      setSanketError('This browser cannot record camera clips for Sanket.');
      return;
    }
    let recorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    const recordClip = () => {
      if (sanketBusyRef.current || recorder?.state === 'recording') return;
      chunks = [];
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') void translateSanketVideo(reader.result);
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      window.setTimeout(() => {
        if (recorder?.state === 'recording') recorder.stop();
      }, 3500);
    };
    recordClip();
    const interval = window.setInterval(recordClip, 5000);
    return () => {
      window.clearInterval(interval);
      if (recorder?.state === 'recording') recorder.stop();
    };
  }, [cameraState.isStreaming, translateSanketVideo, videoRef]);

  const handleSanketUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') void translateSanketVideo(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // Camera/quality hook (Sanket performs the actual video translation)
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
    onMotionFrame: undefined,
    onStableHandFrame: undefined,
    enableClassification: false,
  });

  // Optional facial expression cues (experimental)
  const { cues: faceCues } = useFaceCues(faceCuesEnabled && cameraState.isStreaming, videoRef);

  // Undo Last Token
  const handleUndoToken = () => {
    sequenceManagerRef.current.removeLastToken();
    setTokens(sequenceManagerRef.current.getTokens());
    setSentenceText(sequenceManagerRef.current.getRawSentence());
  };

  // Clear Entire Sequence
  const handleClearSequence = () => {
    sequenceManagerRef.current.clear();
    setTokens([]);
    setSentenceText('');
    clearLiveResult();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Continuous Sign Language Translator"
        description="Temporal landmark sequence pipeline with chronological sign assembly and optional AI assistance."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={faceCuesEnabled ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFaceCuesEnabled(!faceCuesEnabled)}
              leftIcon={<Smile className="w-4 h-4" />}
            >
              Facial Cues (Exp.)
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-card p-3 shadow-xs">
        <div className="mr-auto text-xs text-ink-secondary">
          <strong className="text-ink">Sanket video input:</strong>{' '}
          {cameraState.isStreaming ? 'Camera clips are analyzed automatically' : 'Upload an ISL video or start the camera'}
        </div>
        <input ref={uploadInputRef} type="file" accept="video/*" className="hidden" onChange={handleSanketUpload} />
        <Button size="sm" variant="outline" onClick={() => uploadInputRef.current?.click()}>
          Translate ISL video
        </Button>
      </div>

      <section className="rounded-card border-2 border-forest/30 bg-gradient-to-br from-forest/[0.08] via-card to-card p-5 shadow-sm" aria-live="polite">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-white">
                <Bot className="h-5 w-5" />
            </div>
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-forest">Sanket Output</p>
                <p className="mt-0.5 text-xs text-ink-muted">INCLUDE-trained ISL video-to-English inference</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {sanketStatus}
          </span>
        </div>
        <div className="mt-5 rounded-btn border border-line bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Detected sign</p>
          <p className="mt-1 text-3xl font-bold text-ink">
          {sentenceText || 'Record or upload an ISL video clip'}
          </p>
          {sanketError && <p className="mt-3 text-sm text-status-error">{sanketError}</p>}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          {cameraState.isStreaming
            ? 'A short camera clip is sent to Sanket every few seconds.'
            : 'Start the camera or upload a recorded ISL video.'}
        </p>
      </section>

      <div className="rounded-card border border-line bg-card px-4 py-3 text-sm" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-ink">Recognition status</span>
          <span className="rounded-full bg-sage px-2.5 py-1 text-xs font-semibold text-forest">
            {recognizerReady ? recognitionMode : 'loading'}
          </span>
        </div>
        <p className="mt-1 text-ink-secondary">{liveStatusMessage}</p>
        {liveResult && (
          <p className="mt-1 font-medium text-forest">
            Candidate: {liveResult.mappedText} ({(liveResult.confidence * 100).toFixed(0)}%)
          </p>
        )}
      </div>

      <section className="rounded-card border border-line bg-card p-5 shadow-sm" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest">Translation answer</p>
            <p className="mt-1 text-xs text-ink-muted">Recognized signs appear here as soon as the model confirms them.</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUndoToken}
              disabled={tokens.length === 0}
            >
              Undo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearSequence}
              disabled={tokens.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="mt-4 min-h-20 rounded-btn border border-line bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Answer</p>
          <p className={`mt-2 text-2xl font-semibold ${sentenceText ? 'text-ink' : 'text-ink-muted'}`}>
            {sentenceText || 'Show a sign to start translating.'}
          </p>
        </div>
        {tokens.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Recognized signs">
            {tokens.map((token) => (
              <span key={token.id} className="rounded-full border border-forest/20 bg-sage/40 px-2.5 py-1 text-xs font-medium text-forest">
                {token.text} · {(token.confidence * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-card border border-forest/20 bg-gradient-to-r from-sage/60 via-card to-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-forest text-white shadow-sm">
            <HandMetal className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest">
              One unified recognition pipeline
            </p>
            <p className="mt-1 text-sm text-ink-secondary">
              Sanket processes short video clips with TimeSformer vision, MediaPipe Holistic pose,
              and its trained T5 decoder. No external chat model is used.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
          {[
            ['01', 'Track', 'Webcam + MediaPipe landmarks'],
            ['02', 'Capture', 'Ordered motion frames'],
            ['03', 'Translate', 'Sanket English sentence output'],
          ].map(([step, title, detail]) => (
            <div key={step} className="flex items-center gap-2 rounded-btn border border-line bg-white/70 px-3 py-2">
              <span className="font-mono font-bold text-forest">{step}</span>
              <span className="font-semibold text-ink">{title}</span>
              <span className="text-ink-muted">· {detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Two-Column Translator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera Preview or Demo Mode */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <CameraPreview
            videoRef={videoRef}
            canvasRef={canvasRef}
            cameraState={cameraState}
            onStart={handleStartCamera}
            onStop={handleStopCamera}
            onRetry={handleStartCamera}
          />

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

          {/* Real-time Facial Grammar Feedback */}
          {faceCuesEnabled && faceCues && cameraState.isStreaming && (
            <div className="flex items-center flex-wrap gap-3 p-3 bg-card border border-line rounded-card text-xs">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <Smile className="w-4 h-4 text-forest" /> Facial Grammar Cues (Exp.):
              </span>
              <span className="text-ink-secondary">
                Brow Raise: <strong className="text-ink">{(faceCues.browRaise * 100).toFixed(0)}%</strong>
              </span>
              <span className="text-ink-secondary">
                Mouth Open: <strong className="text-ink">{(faceCues.mouthOpen * 100).toFixed(0)}%</strong>
              </span>
              {faceCues.isQuestionCue && (
                <span className="px-2 py-0.5 rounded bg-forest text-white font-semibold animate-pulse">
                  Question Expression (?)
                </span>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default Translator;
