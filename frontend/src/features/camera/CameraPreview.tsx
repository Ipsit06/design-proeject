import React from 'react';
import { Camera, CameraOff, RefreshCw, AlertCircle, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import type { CameraState } from '../../types/index.js';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  cameraState: CameraState;
  onStart: () => void;
  onStop: () => void;
  onRetry: () => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  videoRef,
  canvasRef,
  cameraState,
  onStart,
  onStop,
  onRetry,
}) => {
  return (
    <div className="flex flex-col h-full bg-card rounded-card border border-line overflow-hidden shadow-card">
      {/* Camera Header Bar */}
      <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-page/40">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-forest" />
          <span className="text-sm font-semibold text-ink">Webcam Feed</span>
        </div>
        <div className="flex items-center gap-2">
          {cameraState.isStreaming ? (
            <span className="flex items-center gap-1.5 text-xs text-status-success font-medium bg-status-successBg px-2 py-0.5 rounded-full border border-status-success/20">
              <span className="w-2 h-2 rounded-full bg-status-success animate-ping" />
              Live Active
            </span>
          ) : cameraState.isLoading ? (
            <span className="text-xs text-status-warning font-medium bg-status-warningBg px-2 py-0.5 rounded-full border border-status-warning/20">
              Initializing...
            </span>
          ) : (
            <span className="text-xs text-ink-muted bg-page px-2 py-0.5 rounded-full border border-line font-medium">
              Camera Stopped
            </span>
          )}
        </div>
      </div>

      {/* Video & Canvas Viewport */}
      <div className="relative flex-1 min-h-[340px] sm:min-h-[420px] bg-ink flex items-center justify-center overflow-hidden">
        {/* Error Overlay */}
        {cameraState.error && (
          <div className="absolute inset-0 z-20 bg-page/95 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-status-errorBg text-status-error flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-ink">Camera Access Notice</h4>
            <p className="text-sm text-ink-secondary max-w-md mt-1.5 leading-relaxed">
              {cameraState.error}
            </p>
            <div className="flex gap-3 mt-4">
              <Button size="sm" variant="outline" onClick={onRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Stopped State Placeholder */}
        {!cameraState.isStreaming && !cameraState.isLoading && !cameraState.error && (
          <div className="absolute inset-0 z-10 bg-page flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-sage text-forest flex items-center justify-center mb-4">
              <CameraOff className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-ink">Camera is Turned Off</h3>
            <p className="text-sm text-ink-secondary max-w-sm mt-1 leading-relaxed">
              Video frames are processed strictly inside your browser and never leave your device. Click start to activate the camera.
            </p>
            <Button
              className="mt-5"
              onClick={onStart}
              leftIcon={<Camera className="w-4 h-4" />}
            >
              Start Camera
            </Button>
          </div>
        )}

        {/* Loading Spinner */}
        {cameraState.isLoading && (
          <div className="absolute inset-0 z-15 bg-page/90 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-forest" />
            <p className="text-sm font-medium text-ink mt-3">Requesting camera permissions...</p>
          </div>
        )}

        {/* Video Element (mirrored horizontally for intuitive selfie view) */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover scale-x-[-1] ${
            cameraState.isStreaming ? 'block' : 'hidden'
          }`}
        />

        {/* Canvas Overlay for hand landmarks */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none ${
            cameraState.isStreaming ? 'block' : 'hidden'
          }`}
        />

        {/* Overlay Landmark Indicator Tag */}
        {cameraState.isStreaming && (
          <div className="absolute bottom-3 left-3 z-10 bg-black/60 backdrop-blur-sm text-white/90 text-xs px-2.5 py-1 rounded flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-sage" />
            <span>Landmark mesh overlay active</span>
          </div>
        )}
      </div>

      {/* Control Actions Bar */}
      <div className="p-4 bg-card border-t border-line flex items-center justify-between gap-3">
        <div className="text-xs text-ink-secondary">
          {cameraState.isStreaming ? (
            <span>Position hand flat within the frame</span>
          ) : (
            <span>Camera inactive</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {cameraState.isStreaming ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              leftIcon={<CameraOff className="w-4 h-4" />}
            >
              Stop Camera
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onStart}
              isLoading={cameraState.isLoading}
              leftIcon={<Camera className="w-4 h-4" />}
            >
              Start Camera
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
