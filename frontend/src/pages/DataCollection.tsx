import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCamera } from '../features/camera/useCamera.js';
import { CameraPreview } from '../features/camera/CameraPreview.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { useToast } from '../components/ui/Toast.js';
import { extractLandmarkFeatures } from '../features/landmarks/extractFeatures.js';
import { evaluateFrameQuality, type QualityIssue } from '../features/quality/frameQuality.js';
import { drawHandLandmarks } from '../features/recognition/drawLandmarks.js';
import { samplesApi } from '../services/samplesApi.js';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import {
  Database,
  Plus,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Play,
  Square,
  Sparkles,
  Layers,
  Lightbulb,
} from 'lucide-react';
import type { Sample, SampleKind, LightingCondition } from '@signbridge/shared';

const PRESET_LABELS = ['ASL_A', 'ASL_B', 'ASL_C', 'ASL_HELLO', 'ASL_THANK_YOU', 'ASL_YES', 'ASL_NO'];

export const DataCollection: React.FC = () => {
  const { showToast } = useToast();
  const [kind, setKind] = useState<SampleKind>('static');
  const [selectedLabel, setSelectedLabel] = useState<string>('ASL_A');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [lighting, setLighting] = useState<LightingCondition>('normal');
  const [targetSamples, setTargetSamples] = useState<number>(50);

  // Storage and counts
  const [samples, setSamples] = useState<Sample[]>([]);
  const [labelCounts, setLabelCounts] = useState<Record<string, number>>({});
  const [isLoadingSamples, setIsLoadingSamples] = useState(true);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedThisSession, setRecordedThisSession] = useState(0);
  const [qualityIssues, setQualityIssues] = useState<QualityIssue[]>([]);

  // Camera & MediaPipe
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { state: cameraState, videoRef, startCamera, stopCamera } = useCamera();
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Active label
  const activeLabel = customLabel.trim() ? customLabel.trim().toUpperCase() : selectedLabel;

  // Load existing samples list
  const loadSamples = useCallback(async () => {
    setIsLoadingSamples(true);
    try {
      const res = await samplesApi.list();
      setSamples(res.items);
      setLabelCounts(res.countsPerLabel);
    } catch {
      showToast('Offline Mode: Samples stored locally.', { type: 'info' });
    } finally {
      setIsLoadingSamples(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSamples();
  }, [loadSamples]);

  // Init MediaPipe for landmark extraction
  useEffect(() => {
    let isCancelled = false;

    async function initVision() {
      try {
        let vision;
        try {
          vision = await FilesetResolver.forVisionTasks('/wasm');
        } catch {
          vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );
        }
        if (isCancelled) return;

        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });

        if (isCancelled) {
          recognizer.close();
          return;
        }
        recognizerRef.current = recognizer;
      } catch (err) {
        console.warn('[DataCollection] MediaPipe init failed:', err);
      }
    }

    initVision();

    return () => {
      isCancelled = true;
      if (recognizerRef.current) {
        try {
          recognizerRef.current.close();
        } catch {}
        recognizerRef.current = null;
      }
    };
  }, []);

  // Frame processing and real-time capture loop
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  const sequenceBufferRef = useRef<number[][]>([]);
  const lastCaptureTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>(Math.random().toString(36).substring(2, 9));

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const recognizer = recognizerRef.current;

    if (video && canvas && recognizer && cameraState.isStreaming) {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const now = performance.now();
        const results = recognizer.recognizeForVideo(video, now);

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        const handednessList = results.handedness
          ? results.handedness.map((h) => h[0]?.categoryName || 'Right')
          : [];

        // Draw landmarks
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (results.landmarks && results.landmarks.length > 0) {
            drawHandLandmarks(ctx, results.landmarks as any, handednessList, canvas.width, canvas.height);
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }

        // Quality check
        const qRes = evaluateFrameQuality(video, (results.landmarks as any) || []);
        setQualityIssues(qRes.issues);

        // Recording logic
        if (isRecordingRef.current && results.landmarks && results.landmarks.length > 0) {
          const { features, handsCount } = extractLandmarkFeatures(
            results.landmarks as any,
            handednessList
          );

          if (kind === 'static') {
            // Enforce minimum 100ms interval between static frames to avoid near-duplicates
            if (now - lastCaptureTimeRef.current >= 100) {
              lastCaptureTimeRef.current = now;

              samplesApi.create({
                label: activeLabel,
                kind: 'static',
                features,
                handsCount,
                lighting,
                sessionId: sessionIdRef.current,
              }).then((created) => {
                setSamples((prev) => [created, ...prev]);
                setLabelCounts((prev) => ({
                  ...prev,
                  [activeLabel]: (prev[activeLabel] || 0) + 1,
                }));
                setRecordedThisSession((r) => r + 1);
              }).catch(() => {});
            }
          } else {
            // Sequence mode: accumulate window of 30 frames
            sequenceBufferRef.current.push(features);
            if (sequenceBufferRef.current.length >= 30) {
              const fullSeq = [...sequenceBufferRef.current];
              sequenceBufferRef.current = [];

              samplesApi.create({
                label: activeLabel,
                kind: 'sequence',
                features: fullSeq,
                handsCount,
                lighting,
                sessionId: sessionIdRef.current,
              }).then((created) => {
                setSamples((prev) => [created, ...prev]);
                setLabelCounts((prev) => ({
                  ...prev,
                  [activeLabel]: (prev[activeLabel] || 0) + 1,
                }));
                setRecordedThisSession((r) => r + 1);
                showToast(`Sequence sample captured for ${activeLabel}`, { type: 'success' });
              }).catch(() => {});
            }
          }
        }
      }
    }

    if (cameraState.isStreaming) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [activeLabel, cameraState.isStreaming, kind, lighting, showToast, videoRef]);

  useEffect(() => {
    if (cameraState.isStreaming) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [cameraState.isStreaming, processFrame]);

  // Start / Stop Recording
  const handleToggleRecord = () => {
    if (!cameraState.isStreaming) {
      showToast('Please start camera first', { type: 'warning' });
      return;
    }
    if (!isRecording) {
      sessionIdRef.current = Math.random().toString(36).substring(2, 9);
      setRecordedThisSession(0);
      setIsRecording(true);
      showToast(`Recording samples for "${activeLabel}"...`, { type: 'info' });
    } else {
      setIsRecording(false);
      showToast(`Finished session. Captured ${recordedThisSession} samples.`, { type: 'success' });
    }
  };

  // Delete all samples for a label
  const handleDeleteByLabel = async (lbl: string) => {
    if (confirm(`Delete all ${labelCounts[lbl] || 0} recorded samples for '${lbl}'?`)) {
      await samplesApi.deleteByLabel(lbl);
      loadSamples();
      showToast(`Samples for '${lbl}' deleted`, { type: 'info' });
    }
  };

  // Export samples as JSON
  const handleExport = async () => {
    try {
      const data = await samplesApi.exportSamples();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signbridge_dataset_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Dataset exported successfully', { type: 'success' });
    } catch {
      showToast('Export failed', { type: 'error' });
    }
  };

  // Import JSON file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : parsed.samples;
      const res = await samplesApi.importSamples(items);
      showToast(`Imported ${res.importedCount} samples`, { type: 'success' });
      loadSamples();
    } catch {
      showToast('Import failed. Invalid dataset file.', { type: 'error' });
    }
  };

  // Check class balance
  const distinctLabels = Object.keys(labelCounts);
  const minCount = distinctLabels.length > 0 ? Math.min(...distinctLabels.map((l) => labelCounts[l])) : 0;
  const maxCount = distinctLabels.length > 0 ? Math.max(...distinctLabels.map((l) => labelCounts[l])) : 0;
  const isImbalanced = distinctLabels.length >= 2 && maxCount > minCount * 3 && maxCount >= 30;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Sign Language Data Collection"
        description="Record labeled 3D landmark feature vectors in the browser to train your own custom vocabulary models."
        actions={
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              <Button variant="outline" size="sm" leftIcon={<Upload className="w-4 h-4" />}>
                Import JSON
              </Button>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={samples.length === 0}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export ({samples.length})
            </Button>
          </div>
        }
      />

      {/* Mode Tabs: Static Postures vs Dynamic Sequences */}
      <div className="flex border border-line rounded-card p-1 bg-page max-w-md">
        <button
          onClick={() => setKind('static')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
            kind === 'static' ? 'bg-card text-forest shadow-xs' : 'text-ink-secondary hover:text-ink'
          }`}
        >
          Static Postures (Alphabet / Signs)
        </button>
        <button
          onClick={() => setKind('sequence')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
            kind === 'sequence' ? 'bg-card text-forest shadow-xs' : 'text-ink-secondary hover:text-ink'
          }`}
        >
          Dynamic Sequences (Experimental)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Camera & Real-Time Quality Guidance */}
        <div className="lg:col-span-7 space-y-4">
          <CameraPreview
            videoRef={videoRef}
            canvasRef={canvasRef}
            cameraState={cameraState}
            onStart={startCamera}
            onStop={() => {
              setIsRecording(false);
              stopCamera();
            }}
            onRetry={startCamera}
          />

          {/* Environmental Quality Guidance Chips */}
          {cameraState.isStreaming && qualityIssues.length > 0 && (
            <div className="p-3 bg-status-warningBg/30 border border-status-warning/40 rounded-card space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-status-warning">
                <Lightbulb className="w-4 h-4" />
                <span>Environmental Quality Guidance:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {qualityIssues.map((issue) => (
                  <span
                    key={issue.id}
                    className="inline-flex items-center gap-1.5 text-xs bg-white text-ink px-2.5 py-1 rounded-btn border border-status-warning/30 font-medium"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
                    <span>{issue.message}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Imbalance Warning Notice */}
          {isImbalanced && (
            <div className="p-3 bg-status-warningBg/20 border border-status-warning/30 rounded-card flex items-center gap-2 text-xs text-status-warning">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Class Imbalance Warning:</strong> Largest class has {maxCount} samples while smallest has {minCount}. Collect more samples for smaller classes for reliable training.
              </span>
            </div>
          )}
        </div>

        {/* Right: Recording Controls & Class Inventory */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-line space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-forest" />
                <h3 className="text-sm font-bold text-ink">Recording Controls</h3>
              </div>
              <Badge variant="default">{kind === 'static' ? 'Static 131D' : 'Temporal 30-Frame'}</Badge>
            </div>

            {/* Label Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                Target Sign / Vocabulary Label:
              </label>

              <div className="flex flex-wrap gap-1.5">
                {PRESET_LABELS.map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => {
                      setSelectedLabel(lbl);
                      setCustomLabel('');
                    }}
                    className={`px-2.5 py-1 text-xs rounded-btn border transition-colors ${
                      selectedLabel === lbl && !customLabel
                        ? 'bg-forest text-white font-semibold'
                        : 'bg-page border-line text-ink-secondary hover:text-ink'
                    }`}
                  >
                    {lbl.replace(/^ASL_/, '')}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Or enter custom label (e.g. NAMASTE)..."
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 rounded-btn border border-line bg-page text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>
            </div>

            {/* Lighting Tag */}
            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">
                Session Lighting Condition:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['normal', 'low_light', 'backlit'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLighting(l)}
                    className={`py-1.5 rounded-btn border capitalize transition-colors ${
                      lighting === l
                        ? 'bg-sage text-forest font-semibold border-forest/30'
                        : 'bg-page border-line text-ink-secondary'
                    }`}
                  >
                    {l.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Record Action Button */}
            <div className="pt-2">
              <Button
                variant={isRecording ? 'danger' : 'primary'}
                className="w-full py-2.5"
                onClick={handleToggleRecord}
                leftIcon={isRecording ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              >
                {isRecording
                  ? `Recording... (${recordedThisSession} captured) — Click to Stop`
                  : `Start Recording Samples for "${activeLabel}"`}
              </Button>
            </div>
          </Card>

          {/* Per-Label Sample Counts & Readiness */}
          <Card className="border-line space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center justify-between">
              <span>Dataset Vocabulary ({distinctLabels.length} classes)</span>
              <span>Total: {samples.length}</span>
            </h4>

            {distinctLabels.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {distinctLabels.map((lbl) => {
                  const count = labelCounts[lbl] || 0;
                  const isReady = count >= 30;

                  return (
                    <div
                      key={lbl}
                      className="p-2 bg-page rounded-btn border border-line flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {isReady ? (
                          <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-status-warning shrink-0" />
                        )}
                        <span className="font-bold text-ink">{lbl}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-ink-secondary">
                          {count} samples {count < 50 && <span className="text-[10px] text-ink-muted">(&ge;50 rec.)</span>}
                        </span>
                        <button
                          onClick={() => handleDeleteByLabel(lbl)}
                          className="p-1 text-ink-muted hover:text-status-error transition-colors"
                          title="Delete samples for label"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-ink-muted italic text-center py-4">
                No samples recorded yet. Position your hand and click start recording.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataCollection;
