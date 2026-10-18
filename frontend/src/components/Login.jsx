import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Lock, TriangleAlert, User, Volume2, VolumeX, Play } from 'lucide-react';
import BrandLogo from './BrandLogo';

/**
 * Official public assets (served from `frontend/public`). Vite maps the bare
 * path to the built URL, so no `/public` prefix is ever used.
 */
const VIDEO_SRC = '/sstv1.0.mp4';

/**
 * Restrained visibility filter: dims and slightly desaturates the footage so
 * white form surfaces and light text stay readable, without hiding the video.
 */
const VIDEO_FILTER = 'brightness(0.52) saturate(0.82) contrast(0.98)';

const FIELD =
  'w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

/**
 * Whether the visitor asked the OS to reduce motion. Read synchronously on
 * first render so the video never autoplays (even briefly) for those users.
 */
function initialReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Sign-in screen with a full-screen background video.
 *
 * The video is decorative: it sits behind the form, is hidden from assistive
 * technology, and never intercepts pointer events. Its playback is attempted
 * with the original audio *unmuted*; if the browser blocks audible autoplay we
 * surface a single, honest "play with sound" affordance rather than muting the
 * clip or faking a working player. A small control then lets the operator mute
 * or restore the sound. The form itself, its validation and the submit flow are
 * unchanged and independent of the video.
 */
export default function Login({ onLogin, error, loading }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);

  const videoRef = useRef(null);
  // 'loading' | 'playing' | 'blocked' | 'paused' | 'error'
  const [playback, setPlayback] = useState('loading');
  const [muted, setMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(initialReducedMotion);

  // Track the OS preference; a paused frame replaces autoplay under reduce.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, []);

  // Attempt audible autoplay once. Never restarts on ordinary state changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    if (reducedMotion) {
      video.pause();
      setPlayback('paused');
      return undefined;
    }

    let cancelled = false;
    const attempt = video.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt
        .then(() => {
          if (!cancelled) setPlayback('playing');
        })
        .catch(() => {
          // Autoplay-with-sound was refused; wait for an explicit gesture.
          if (!cancelled) setPlayback('blocked');
        });
    } else {
      setPlayback('playing');
    }
    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setMuted(false);
    const attempt = video.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt.then(() => setPlayback('playing')).catch(() => setPlayback('blocked'));
    } else {
      setPlayback('playing');
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
  }, []);

  const onVideoPlaying = useCallback(() => setPlayback('playing'), []);
  const onVideoError = useCallback(() => {
    setPlayback('error');
    if (import.meta.env.DEV) {
      console.warn(`[Login] background video failed to load: ${VIDEO_SRC}`);
    }
  }, []);

  const showPrompt = playback === 'blocked' || playback === 'paused';
  const showSound = playback === 'playing';

  const submit = (e) => {
    e.preventDefault();
    onLogin(username.trim(), password);
  };

  return (
    <div
      className={`relative flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 pt-10 ${
        showPrompt ? 'pb-28' : 'pb-10'
      } sm:pb-12`}
      style={{ minHeight: '100dvh' }}
    >
      {/* ---- Layer 1 + 2: background video and readability overlay ---- */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          style={{ filter: VIDEO_FILTER }}
          autoPlay={!reducedMotion}
          loop
          playsInline
          preload="auto"
          muted={muted}
          disablePictureInPicture
          tabIndex={-1}
          onPlaying={onVideoPlaying}
          onError={onVideoError}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
        {/* Neutral dark overlay: lifts text/form contrast without tinting hue. */}
        <div className="absolute inset-0 bg-slate-950/35"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/45 via-slate-950/20 to-transparent"></div>
      </div>

      {/* ---- Layer 3: login content ---- */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo size="login" plate className="rounded-lg" />
          <div className="min-w-0 leading-tight">
            <p className="text-[17px] font-semibold tracking-tight text-white">WatLab</p>
            <p className="truncate text-[10px] uppercase tracking-[0.14em] text-slate-300">
              Energy management system
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-floating">
          <h1 className="text-[16px] font-semibold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1 text-[12px] text-slate-500">
            Authenticate to access the energy console.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-600">Username</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={FIELD}
                  placeholder="admin"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-600">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={reveal ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${FIELD} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  aria-label={reveal ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-medium text-red-700"
              >
                <TriangleAlert className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !username || !password} className="wl-btn-primary-block">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center font-mono text-[10px] text-slate-400">
          WatLab · v1.0 · MQTT · REST · Socket.io
        </p>
      </div>

      {/* ---- Layer 4: sound control ---- */}
      {showSound && (
        <div className="absolute right-4 top-4 z-30">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute background video' : 'Mute background video'}
            aria-pressed={muted}
            title={muted ? 'Unmute background video' : 'Mute background video'}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-slate-900/70 text-white transition hover:bg-slate-900/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* ---- Layer 5: autoplay / reduced-motion prompt ---- */}
      {showPrompt && (
        <div className="absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="flex w-full max-w-md flex-wrap items-center justify-between gap-3 rounded-lg border border-white/15 bg-slate-900/90 px-3 py-2.5 shadow-floating">
            <p className="min-w-0 text-[11px] leading-4 text-slate-200">
              {playback === 'paused'
                ? 'Background video paused to respect reduced-motion.'
                : 'Your browser blocked autoplay with sound.'}
            </p>
            <button
              type="button"
              onClick={startPlayback}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <Play className="h-3.5 w-3.5" />
              Play background video with sound
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
