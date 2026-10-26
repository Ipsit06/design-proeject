import { useState, useRef, useCallback, useEffect } from 'react';
import type { CameraState } from '../../types/index.js';

export function useCamera() {
  const [state, setState] = useState<CameraState>({
    isStreaming: false,
    isLoading: false,
    error: null,
    hasPermission: null,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('[Camera] Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState((prev) => ({
      ...prev,
      isStreaming: false,
      isLoading: false,
    }));
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setState((prev) => ({
        ...prev,
        error: 'Camera access is not supported in this browser.',
        isLoading: false,
      }));
      return;
    }

    // Stop existing stream if any
    stopCamera();

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState({
        isStreaming: true,
        isLoading: false,
        error: null,
        hasPermission: true,
      });
    } catch (err: any) {
      console.error('[Camera] getUserMedia failed:', err);
      let errorMessage = 'Failed to access camera.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission was denied. Please allow camera access in your browser settings to use live recognition.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera device found on your system. Please connect a webcam or switch to Demo Mode.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Camera is currently in use by another application. Please close other camera apps and retry.';
      }

      setState({
        isStreaming: false,
        isLoading: false,
        error: errorMessage,
        hasPermission: false,
      });
    }
  }, [stopCamera]);

  // Clean up all tracks on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    state,
    videoRef,
    streamRef,
    startCamera,
    stopCamera,
  };
}
