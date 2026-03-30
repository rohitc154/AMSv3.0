import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_FRAMES = 5;
const MAX_FRAMES = 10;

export function FaceCapture({ onFramesChange, disabled }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [frames, setFrames] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        setError('Camera access denied or unavailable.');
      }
    }
    start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || frames.length >= MAX_FRAMES) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setFrames((prev) => {
          const next = [...prev, blob];
          onFramesChange?.(next);
          return next;
        });
      },
      'image/jpeg',
      0.92
    );
  }, [frames.length, onFramesChange]);

  const clearFrames = () => {
    setFrames([]);
    onFramesChange?.([]);
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black aspect-video max-w-lg">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={captureFrame}
          disabled={disabled || frames.length >= MAX_FRAMES}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Capture frame ({frames.length}/{MAX_FRAMES})
        </button>
        <button
          type="button"
          onClick={clearFrames}
          disabled={disabled || frames.length === 0}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          Clear
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Capture between {MIN_FRAMES} and {MAX_FRAMES} frames (camera only — no file uploads).
      </p>
      {frames.length > 0 && frames.length < MIN_FRAMES && (
        <p className="text-sm text-amber-400">Need at least {MIN_FRAMES} frames to register.</p>
      )}
    </div>
  );
}

export { MIN_FRAMES, MAX_FRAMES };
