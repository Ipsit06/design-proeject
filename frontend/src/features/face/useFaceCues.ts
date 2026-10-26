import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

export interface FaceCues {
  browRaise: number; // 0 to 1
  browFurrow: number; // 0 to 1
  mouthOpen: number; // 0 to 1
  headPitch: number; // -1 to 1 (nod up/down)
  headYaw: number; // -1 to 1 (turn left/right)
  headRoll: number; // -1 to 1 (tilt)
  isQuestionCue: boolean;
}

export function useFaceCues(enabled: boolean, videoRef: React.RefObject<HTMLVideoElement>) {
  const [cues, setCues] = useState<FaceCues | null>(null);
  const [isFaceReady, setIsFaceReady] = useState(false);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const frameCounterRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setCues(null);
      return;
    }

    let isCancelled = false;

    async function initFaceLandmarker() {
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

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          numFaces: 1,
        });

        if (isCancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setIsFaceReady(true);
      } catch (e) {
        console.warn('[FaceCues] Failed to init FaceLandmarker (optional cue feature):', e);
      }
    }

    initFaceLandmarker();

    return () => {
      isCancelled = true;
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {}
        landmarkerRef.current = null;
      }
      setIsFaceReady(false);
    };
  }, [enabled]);

  const processFaceFrame = useCallback((timestampMs: number) => {
    if (!enabled || !landmarkerRef.current || !videoRef.current) return null;

    frameCounterRef.current += 1;
    // Process every 3rd frame to conserve browser compute
    if (frameCounterRef.current % 3 !== 0) return cues;

    const video = videoRef.current;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

    try {
      const result = landmarkerRef.current.detectForVideo(video, timestampMs);

      if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
        const shapes = result.faceBlendshapes[0].categories;
        const findShape = (name: string) => shapes.find((s) => s.categoryName === name)?.score || 0;

        const browInnerUp = findShape('browInnerUp');
        const browDownL = findShape('browDownLeft');
        const browDownR = findShape('browDownRight');
        const jawOpen = findShape('jawOpen');

        const browRaise = browInnerUp;
        const browFurrow = (browDownL + browDownR) / 2;
        const mouthOpen = jawOpen;

        // Question cue in ASL: raised brows with slight forward head tilt
        const isQuestionCue = browRaise > 0.45;

        const updated: FaceCues = {
          browRaise: Number(browRaise.toFixed(2)),
          browFurrow: Number(browFurrow.toFixed(2)),
          mouthOpen: Number(mouthOpen.toFixed(2)),
          headPitch: 0,
          headYaw: 0,
          headRoll: 0,
          isQuestionCue,
        };

        setCues(updated);
        return updated;
      } else {
        setCues(null);
      }
    } catch {}
    return null;
  }, [cues, enabled, videoRef]);

  return {
    cues,
    isFaceReady,
    processFaceFrame,
  };
}
