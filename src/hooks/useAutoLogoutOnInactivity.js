import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // same 30 minutes as the web AuthContext
const TOUCH_THROTTLE_MS = 1000;

/**
 * Mobile port of the web app's hooks/useAutoLogoutOnInactivity.js. There are no
 * mousemove/keydown events here, so activity = any touch (spread the returned
 * `responderProps` on a root View - it observes touches without claiming them).
 * JS timers are not reliable while the app is backgrounded, so on return to the
 * foreground the elapsed time is checked directly instead of trusting the timer.
 */
export default function useAutoLogoutOnInactivity({ enabled, timeoutMs = DEFAULT_TIMEOUT_MS, onTimeout }) {
  const timerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const firedRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const fire = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    clearTimer();
    onTimeoutRef.current?.();
  }, []);

  const schedule = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(fire, timeoutMs);
  }, [fire, timeoutMs]);

  useEffect(() => {
    if (!enabled) return undefined;
    firedRef.current = false;
    lastActivityRef.current = Date.now();
    schedule();

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        if (Date.now() - lastActivityRef.current >= timeoutMs) fire();
        else schedule();
      } else {
        clearTimer();
      }
    });

    return () => {
      subscription.remove();
      clearTimer();
    };
  }, [enabled, timeoutMs, schedule, fire]);

  const onActivity = useCallback(() => {
    if (!enabled || firedRef.current) return false;
    const now = Date.now();
    if (now - lastActivityRef.current >= TOUCH_THROTTLE_MS) {
      lastActivityRef.current = now;
      schedule();
    }
    return false; // never claim the touch
  }, [enabled, schedule]);

  return { responderProps: { onStartShouldSetResponderCapture: onActivity } };
}
