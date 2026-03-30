import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AttendancePage() {
  const { user, isPlatformAdmin } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [geo, setGeo] = useState(null);

  useEffect(() => {
    if (isPlatformAdmin) return undefined;
    let cancelled = false;
    async function cam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError('Camera unavailable.');
      }
    }
    cam();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [isPlatformAdmin]);

  const captureBlob = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
    });
  }, []);

  const getPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        reject,
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });

  if (isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-300">
          Application administrators cannot mark attendance. Sign in as a member linked to an
          organization.
        </p>
        <Link to="/dashboard" className="mt-6 inline-block text-indigo-400 hover:text-indigo-300">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  async function markAttendance() {
    setError('');
    setStatus('');
    setSubmitting(true);
    try {
      const blob = await captureBlob();
      if (!blob) {
        throw new Error('Could not capture image');
      }
      const position = await getPosition();
      setGeo(position);

      const fd = new FormData();
      fd.append('image', blob, 'attendance.jpg');
      fd.append('memberId', user.memberId);
      fd.append('latitude', String(position.latitude));
      fd.append('longitude', String(position.longitude));
      fd.append('timestamp', new Date().toISOString());

      await api.post('/attendance/mark', fd);
      setStatus('Attendance marked successfully.');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to mark attendance';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-white">Mark attendance</h1>
      <p className="mt-1 text-sm text-slate-400">
        Uses your camera and current GPS location. You must be within your organization geofence.
      </p>

      <div className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="aspect-video overflow-hidden rounded-xl border border-slate-700 bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        </div>
        {error && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {status && (
          <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {status}
          </div>
        )}
        {geo && (
          <p className="text-xs text-slate-500">
            Last location: {geo.latitude.toFixed(5)}, {geo.longitude.toFixed(5)}
          </p>
        )}
        <button
          type="button"
          onClick={markAttendance}
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? 'Processing…' : 'Mark attendance'}
        </button>
      </div>
    </div>
  );
}
