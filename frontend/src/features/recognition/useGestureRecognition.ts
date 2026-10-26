import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { drawHandLandmarks } from './drawLandmarks.js';
import { GestureDebouncer } from './debounce.js';
import { RollingSequenceBuffer } from './sequenceBuffer.js';
import { getAdapterForMode, type RecognitionAdapter, type AdapterRecognitionResult } from './adapters/index.js';
import { evaluateFrameQuality, type FrameQualityResult } from '../quality/frameQuality.js';
import type { RecognitionMode } from '@signbridge/shared';
import type { Point3D } from './geometry.js';

export type ExtendedRecognitionStatus =
  | 'camera_initializing'
  | 'model_loading'
  | 'hand_detected'
  | 'recognizing'
  | 'sign_recognized'
  | 'uncertain_result'
  | 'no_hand'
  | 'service_unavailable'
  | 'idle';

interface UseGestureRecognitionOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isStreaming: boolean;
  mode: RecognitionMode;
  confidenceThreshold?: number;
  holdTimeMs?: number;
  onSignRecognized?: (result: AdapterRecognitionResult) => void;
  onMotionFrame?: (frame: { timestamp: number; landmarks: Point3D[][]; handedness: string[] }) => void;
  onStableHandFrame?: (frame: { imageData: string; landmarks: Point3D[][] }) => void;
  enableClassification?: boolean;
}

export function useGestureRecognition({
  videoRef,
  canvasRef,
  isStreaming,
  mode,
  confidenceThreshold = 0.65,
  holdTimeMs = 350,
  onSignRecognized,
  onMotionFrame,
  onStableHandFrame,
  enableClassification = true,
}: UseGestureRecognitionOptions) {
  const [recognizerReady, setRecognizerReady] = useState(false);
  const [status, setStatus] = useState<ExtendedRecognitionStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('Start your camera to begin.');
  const [currentResult, setCurrentResult] = useState<AdapterRecognitionResult | null>(null);
  const [qualityResult, setQualityResult] = useState<FrameQualityResult | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // References
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const requestAnimationRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const isProcessingRef = useRef<boolean>(false);
  const qualityCounterRef = useRef<number>(0);
  const debouncerRef = useRef<GestureDebouncer>(new GestureDebouncer(4));
  const bufferRef = useRef<RollingSequenceBuffer>(new RollingSequenceBuffer(25, 0.0007, holdTimeMs));
  const adapterRef = useRef<RecognitionAdapter>(getAdapterForMode(mode));

  const confidenceThresholdRef = useRef(confidenceThreshold);
  confidenceThresholdRef.current = confidenceThreshold;

  const onSignRecognizedRef = useRef(onSignRecognized);
  onSignRecognizedRef.current = onSignRecognized;
  const onMotionFrameRef = useRef(onMotionFrame);
  onMotionFrameRef.current = onMotionFrame;
  const onStableHandFrameRef = useRef(onStableHandFrame);
  onStableHandFrameRef.current = onStableHandFrame;
  const lastVisionCallRef = useRef(0);

  // Update active adapter when mode changes
  useEffect(() => {
    const adapter = getAdapterForMode(mode);
    adapterRef.current = adapter;
    debouncerRef.current.reset();
    bufferRef.current.reset();
    setCurrentResult(null);
    if (adapter.loadModel) {
      adapter.loadModel().then((loaded) => {
        if (!loaded) {
          console.warn(`[Recognition] No trained model is available for ${mode}.`);
        }
      }).catch((error) => {
        console.warn(`[Recognition] Failed to load ${mode} model:`, error);
      });
    }
  }, [mode]);

  // Initialize MediaPipe Gesture Recognizer asynchronously
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipe() {
      setStatus('model_loading');
      setStatusMessage('Loading MediaPipe vision model...');

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

        let recognizer: GestureRecognizer;
        try {
          recognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/gesture_recognizer.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 2, // Dual-hand landmark extraction support
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch {
          recognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/gesture_recognizer.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        if (isCancelled) {
          recognizer.close();
          return;
        }

        recognizerRef.current = recognizer;
        setRecognizerReady(true);
        setStatus('idle');
        setStatusMessage('Model ready. Start camera to translate.');
      } catch (err: any) {
        console.error('[MediaPipe] Init error:', err);
        if (!isCancelled) {
          setInitError(err.message || 'Vision model failed to load');
          setStatus('service_unavailable');
          setStatusMessage('Recognition service unavailable. Use Demo Mode.');
        }
      }
    }

    initMediaPipe();

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

  // Frame recognition loop
  const predictFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const recognizer = recognizerRef.current;

    if (!video || !canvas || !recognizer || !isStreaming) {
      return;
    }

    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.currentTime !== lastVideoTimeRef.current &&
      !isProcessingRef.current
    ) {
      isProcessingRef.current = true;
      lastVideoTimeRef.current = video.currentTime;

      try {
        const timestampMs = performance.now();
        const results = recognizer.recognizeForVideo(video, timestampMs);

        // Adjust canvas dimensions to match video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        const handednessList = results.handedness
          ? results.handedness.map((h) => h[0]?.categoryName || 'Right')
          : [];
        onMotionFrameRef.current?.({
          timestamp: timestampMs,
          landmarks: results.landmarks as Point3D[][],
          handedness: handednessList,
        });

        // Evaluate frame quality periodically
        qualityCounterRef.current += 1;
        if (qualityCounterRef.current % 6 === 0) {
          const qRes = evaluateFrameQuality(video, (results.landmarks as any) || []);
          setQualityResult(qRes);
        }

        // Draw landmarks on overlay canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (results.landmarks && results.landmarks.length > 0) {
            drawHandLandmarks(ctx, results.landmarks as any, handednessList, canvas.width, canvas.height);
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }

        // Check if at least one hand is detected
        if (results.landmarks && results.landmarks.length > 0) {
          const motion = bufferRef.current.addFrame(
            timestampMs,
            results.landmarks as any,
            handednessList
          );

          if (motion.isMovingFast) {
            setStatus('recognizing');
            setStatusMessage('Hand in motion (transitioning)...');
          } else {
            // Hand is held steady or steadying
            setStatus('hand_detected');
            setStatusMessage('Hand detected. Analyzing geometry...');

            if (motion.isStableHold && timestampMs - lastVisionCallRef.current >= 2500) {
              const captureCanvas = document.createElement('canvas');
              const sourceWidth = video.videoWidth || 640;
              const sourceHeight = video.videoHeight || 480;
              const scale = Math.min(1, 640 / sourceWidth);
              captureCanvas.width = Math.max(1, Math.round(sourceWidth * scale));
              captureCanvas.height = Math.max(1, Math.round(sourceHeight * scale));
              const captureContext = captureCanvas.getContext('2d');
              if (captureContext) {
                captureContext.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
                lastVisionCallRef.current = timestampMs;
                onStableHandFrameRef.current?.({
                  imageData: captureCanvas.toDataURL('image/jpeg', 0.62),
                  landmarks: results.landmarks as Point3D[][],
                });
              }
            }

            // Run the selected local adapter so stable hand patterns become
            // translation tokens while the optional Gemini vision call runs.
            const adapterResult = enableClassification
              ? adapterRef.current.processFrame({
                  timestamp: timestampMs,
                  landmarks: results.landmarks as any,
                  handedness: handednessList,
                  rawGestures: results.gestures as any,
                  velocity: motion.velocity,
                  isStableHold: motion.isStableHold,
                  confidenceThreshold: confidenceThresholdRef.current,
                })
              : null;

            if (adapterResult) {
              // Pass through temporal debouncer
              const { stableCategory, stableScore, isNewGesture } = debouncerRef.current.process(
                adapterResult.label,
                adapterResult.confidence
              );

              if (stableCategory === adapterResult.label) {
                setStatus('sign_recognized');
                setStatusMessage(`Recognized: ${adapterResult.mappedText} (${(adapterResult.confidence * 100).toFixed(0)}%)`);
                setCurrentResult(adapterResult);

                if (isNewGesture) {
                  onSignRecognizedRef.current?.(adapterResult);
                }
              }
            } else {
              // No candidate exceeded confidence threshold
              debouncerRef.current.process(null, 0);
              setStatus('uncertain_result');
              setStatusMessage('Holding hand posture — identifying sign...');
            }
          }
        } else {
          // No hand in frame
          bufferRef.current.reset();
          debouncerRef.current.process(null, 0);
          setStatus('no_hand');
          setStatusMessage('No hand detected in camera frame.');
        }
      } catch (inferenceErr) {
        console.warn('[Recognition Loop Error]:', inferenceErr);
      } finally {
        isProcessingRef.current = false;
      }
    }

    if (isStreaming) {
      requestAnimationRef.current = requestAnimationFrame(predictFrame);
    }
  }, [canvasRef, enableClassification, isStreaming, videoRef]);

  // Start / Stop animation frame loop
  useEffect(() => {
    if (isStreaming && recognizerReady) {
      setStatus('recognizing');
      setStatusMessage('Looking for signs or gestures...');
      requestAnimationRef.current = requestAnimationFrame(predictFrame);
    } else {
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
        requestAnimationRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      bufferRef.current.reset();
      debouncerRef.current.reset();
      setCurrentResult(null);
      if (!isStreaming) {
        setStatus('idle');
        setStatusMessage('Start your camera to begin.');
      }
    }

    return () => {
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
        requestAnimationRef.current = null;
      }
    };
  }, [isStreaming, recognizerReady, predictFrame, canvasRef]);

  const clearResult = useCallback(() => {
    debouncerRef.current.reset();
    bufferRef.current.reset();
    setCurrentResult(null);
    setStatus('recognizing');
    setStatusMessage('Cleared. Point hand at camera.');
  }, []);

  return {
    recognizerReady,
    status,
    statusMessage,
    currentResult,
    qualityResult,
    initError,
    clearResult,
  };
}
