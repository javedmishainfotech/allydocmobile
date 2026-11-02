import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { acceptCall, declineCall, getCallAcceptRefusal } from '../services/callService';
import { syncPushToken, clearPushToken } from '../services/pushNotifications';
import { navigate } from '../navigation/navigationRef';
import { toast } from '../utils/toast';

const DEFAULT_RINGING_TIMEOUT_SECONDS = 45;
// 'declined' / 'answered_elsewhere' / doctor-ended reasons all mean "stop ringing, the call isn't
// coming to this device" - 'timeout' is the server's own auto-decline echo.
const DOCTOR_ENDED_CALL_REASONS = new Set(['doctor_left', 'doctor_cancelled']);
const STOP_RINGING_DISMISS_REASONS = new Set([...DOCTOR_ENDED_CALL_REASONS, 'timeout', 'answered_elsewhere', 'declined']);
const MAX_REMEMBERED_SESSIONS = 20;

const IncomingCallContext = createContext(null);

export function useIncomingCall() {
  const context = useContext(IncomingCallContext);
  if (!context) throw new Error('useIncomingCall must be used within an IncomingCallProvider');
  return context;
}

function normalizeId(value) {
  return value ? String(value).trim() : '';
}

function normalizeReason(reason) {
  return String(reason || '').trim().toLowerCase();
}

function rememberIn(setRef, id) {
  const normalized = normalizeId(id);
  if (!normalized) return;
  const set = setRef.current;
  set.add(normalized);
  if (set.size > MAX_REMEMBERED_SESSIONS) set.delete(set.values().next().value);
}

/** Mirrors App.jsx's parseIncomingCallData - the exact fields RepoBookAppointment.cs's
 * CALL_RINGING push sends (type, appointmentId, callSessionId, callType, doctorName,
 * doctorProfileImage, expiresAt, timestamp). */
function parseIncomingCallData(data = {}) {
  const appointmentId = Number(data.appointmentId || data.AppointmentId || 0);
  const callSessionId = normalizeId(data.callSessionId || data.call_session_id || data.callSessionID);
  if (!appointmentId || !callSessionId) {
    console.log('[call] parseIncomingCallData: rejected (missing appointmentId/callSessionId)', data);
    return null;
  }
  return {
    appointmentId,
    callSessionId,
    callType: data.callType || data.call_type || 'video',
    callerName: data.doctorName || data.callerName || '',
    callerImage: data.doctorProfileImage || data.callerImage || '',
    expiresAt: data.expiresAt || null,
    ringingTimeoutSeconds: Number(data.ringingTimeoutSeconds) || DEFAULT_RINGING_TIMEOUT_SECONDS,
    receivedAt: Date.now(),
  };
}

/**
 * Port of AllyDocReactApp's App.jsx FCM/incoming-call wiring: registers the device's FCM token
 * while logged in, listens for CALL_RINGING/CALL_STOP_RINGING/CALL_ANSWERED_ELSEWHERE/
 * CALL_DECLINED/CALL_MISSED pushes, and exposes the ringing call plus Join/Decline handlers to
 * `IncomingCallModal`. Mounted once near the app root (see RootNavigator).
 */
export function IncomingCallProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { refreshUnreadCount } = useNotifications();
  const [incomingCall, setIncomingCall] = useState(null);
  const wasAuthenticatedRef = useRef(false);
  const stoppedSessionsRef = useRef(new Set());
  const handledLocallyRef = useRef(new Set());

  useEffect(() => {
    console.log('[call] IncomingCallProvider auth effect, isAuthenticated =', isAuthenticated);
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
      syncPushToken().then((token) => console.log('[call] syncPushToken resolved, token =', token));
    } else if (wasAuthenticatedRef.current) {
      wasAuthenticatedRef.current = false;
      setIncomingCall(null);
      clearPushToken();
    }
  }, [isAuthenticated]);

  const closeForSession = useCallback((callSessionId, { toastMessage } = {}) => {
    const normalized = normalizeId(callSessionId);
    if (!normalized) return;
    let matched = false;
    setIncomingCall((prev) => {
      if (normalizeId(prev?.callSessionId) === normalized) {
        matched = true;
        return null;
      }
      return prev;
    });
    if (matched && toastMessage && !handledLocallyRef.current.has(normalized)) {
      toast.info(toastMessage);
    }
  }, []);

  const handleJoin = useCallback(
    async ({ appointmentId, callSessionId, callType, callerName }) => {
      rememberIn(handledLocallyRef, callSessionId);
      try {
        const result = await acceptCall({ appointmentId, callSessionId });
        const refusal = getCallAcceptRefusal(result);
        if (refusal === 'answered_elsewhere') {
          rememberIn(stoppedSessionsRef, callSessionId);
          closeForSession(callSessionId);
          toast.info('Call already answered on another device.');
          return;
        }
        if (refusal === 'ended') {
          rememberIn(stoppedSessionsRef, callSessionId);
          closeForSession(callSessionId);
          toast.info('This call has ended.');
          return;
        }
        if (refusal) {
          toast.error('Unable to join call right now. Please try again.');
          return;
        }
        closeForSession(callSessionId);
        navigate('VideoCall', {
          appointmentId,
          isAudio: String(callType || 'video').toLowerCase() === 'audio',
          counterpartName: callerName || undefined,
        });
      } catch {
        toast.error('Unable to join call right now. Please try again.');
      }
    },
    [closeForSession],
  );

  const handleDecline = useCallback(
    async ({ appointmentId, callSessionId, isAutoReject = false }) => {
      rememberIn(handledLocallyRef, callSessionId);
      if (appointmentId) {
        await declineCall({ appointmentId, callSessionId, isAutoReject });
      }
      closeForSession(callSessionId);
      toast.info(
        isAutoReject
          ? 'Call was automatically declined because you did not answer or decline.'
          : 'You declined the call.',
      );
    },
    [closeForSession],
  );

  const handlePushData = useCallback(
    (data = {}, notificationBody) => {
      const type = data.type;
      console.log('[call] handlePushData type =', type, 'data =', data);

      // Any non-call push (appointment/payment/etc. updates) - toast it and refresh the bell
      // badge, mirroring web's generic `toast.info` + `notifyFcmBell` branch.
      if (notificationBody && !String(type || '').startsWith('CALL_')) {
        toast.info(notificationBody);
        refreshUnreadCount();
      }

      if (type === 'CALL_RINGING') {
        const incoming = parseIncomingCallData(data);
        if (!incoming) {
          console.log('[call] CALL_RINGING ignored - failed to parse');
          return;
        }
        if (stoppedSessionsRef.current.has(incoming.callSessionId)) {
          console.log('[call] CALL_RINGING ignored - session already stopped', incoming.callSessionId);
          return;
        }
        console.log('[call] CALL_RINGING accepted, showing ring popup for', incoming);
        setIncomingCall((prev) => (prev?.callSessionId === incoming.callSessionId ? { ...prev, ...incoming } : incoming));
        return;
      }

      if (type === 'CALL_STOP_RINGING' || type === 'CALL_ANSWERED_ELSEWHERE') {
        const reason = normalizeReason(data.reason);
        const sessionId = data.callSessionId || data.call_session_id || data.callSessionID;
        if (type === 'CALL_STOP_RINGING') rememberIn(stoppedSessionsRef, sessionId);
        const shouldDismiss = type === 'CALL_ANSWERED_ELSEWHERE' || STOP_RINGING_DISMISS_REASONS.has(reason);
        if (!shouldDismiss) return;
        const toastMessage =
          type === 'CALL_ANSWERED_ELSEWHERE'
            ? 'Call already answered on another device.'
            : reason === 'declined'
              ? 'Call was declined on another device.'
              : DOCTOR_ENDED_CALL_REASONS.has(reason)
                ? 'Doctor started the call but disconnected before you joined.'
                : null;
        closeForSession(sessionId, { toastMessage });
        return;
      }

      // Doctor-side pushes: the patient declined or the ring timed out unanswered.
      if (type === 'CALL_DECLINED') {
        const isAutoReject = data.isAutoReject === 'true' || data.isAutoRejected === 'true';
        toast.info(
          isAutoReject
            ? 'Call was automatically declined because patient did not answer or decline.'
            : 'Call declined by patient.',
        );
        return;
      }
      if (type === 'CALL_MISSED') {
        toast.info('Call was automatically declined because patient did not answer or decline.');
      }
    },
    [closeForSession, refreshUnreadCount],
  );

  useEffect(() => {
    console.log('[call] subscribing notification listeners, isAuthenticated =', isAuthenticated);
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[call] addNotificationReceivedListener fired, isAuthenticated =', isAuthenticated, notification?.request?.content);
      if (!isAuthenticated) return;
      const content = notification.request.content;
      handlePushData(content.data || {}, content.body);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[call] addNotificationResponseReceivedListener fired, actionIdentifier =', response?.actionIdentifier, response?.notification?.request?.content);
      if (!isAuthenticated) return;
      const data = response.notification.request.content.data || {};
      if (data.type !== 'CALL_RINGING') {
        handlePushData(data);
        return;
      }
      const incoming = parseIncomingCallData(data);
      if (!incoming) return;
      if (response.actionIdentifier === 'decline_call') {
        handleDecline(incoming);
        return;
      }
      if (response.actionIdentifier === 'join_call') {
        handleJoin(incoming);
        return;
      }
      // A plain tap (not an action button): show the ring popup so the user can still choose.
      handlePushData(data);
    });

    return () => {
      console.log('[call] unsubscribing notification listeners');
      receivedSub.remove();
      responseSub.remove();
    };
  }, [isAuthenticated, handlePushData, handleJoin, handleDecline]);

  const value = useMemo(() => ({ incomingCall, handleJoin, handleDecline }), [incomingCall, handleJoin, handleDecline]);

  return <IncomingCallContext.Provider value={value}>{children}</IncomingCallContext.Provider>;
}
