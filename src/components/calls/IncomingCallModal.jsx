import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import Avatar from '../Avatar';
import { useIncomingCall } from '../../contexts/IncomingCallContext';
import { adTokens } from '../../theme/colors';

const DEFAULT_RINGING_SECONDS = 45;
const RINGTONE = require('../../../assets/sounds/ringtone-soft.mp3');

/**
 * Port of AllyDocReactApp's IncomingCallPopup.jsx + DeclineCallConfirmationModal.jsx: ringing
 * popup with a looping ringtone, a countdown that auto-declines the call when it reaches zero,
 * and Join (video/audio, whichever the call is) / Decline actions. Mounted once near the app
 * root (see RootNavigator) and driven entirely by IncomingCallContext.
 */
export default function IncomingCallModal() {
  const { incomingCall, handleJoin, handleDecline } = useIncomingCall();
  const player = useAudioPlayer(RINGTONE);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_RINGING_SECONDS);
  const [isJoining, setIsJoining] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const autoDeclinedRef = useRef('');

  const isShowing = Boolean(incomingCall?.appointmentId && incomingCall?.callSessionId);
  const totalSeconds = Number(incomingCall?.ringingTimeoutSeconds) > 0 ? Number(incomingCall.ringingTimeoutSeconds) : DEFAULT_RINGING_SECONDS;
  const isBusy = isJoining || isDeclining;

  // Ringtone loop + countdown reset for every new call session.
  useEffect(() => {
    if (!isShowing) return undefined;
    const elapsed = Math.floor((Date.now() - (incomingCall.receivedAt || Date.now())) / 1000);
    setSecondsLeft(Math.max(0, totalSeconds - elapsed));
    autoDeclinedRef.current = '';
    setConfirmDecline(false);
    player.loop = true;
    player.seekTo(0);
    player.play();
    return () => {
      player.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShowing, incomingCall?.callSessionId]);

  // Countdown tick.
  useEffect(() => {
    if (!isShowing || isBusy) return undefined;
    const id = setInterval(() => setSecondsLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(id);
  }, [isShowing, isBusy]);

  // Auto-decline (missed call) once per session when the countdown reaches zero.
  useEffect(() => {
    if (!isShowing || secondsLeft > 0 || isBusy) return;
    const sessionId = incomingCall.callSessionId;
    if (autoDeclinedRef.current === sessionId) return;
    autoDeclinedRef.current = sessionId;
    handleDecline({ appointmentId: incomingCall.appointmentId, callSessionId: sessionId, isAutoReject: true });
  }, [isShowing, secondsLeft, isBusy, incomingCall, handleDecline]);

  if (!isShowing) return null;

  const isVideoCall = String(incomingCall.callType || 'video').toLowerCase() === 'video';
  const rawName = String(incomingCall.callerName || '').trim();
  const displayName = rawName ? (/^dr\.?\s+/i.test(rawName) ? rawName : `Dr. ${rawName}`) : 'Your doctor';

  const onJoin = async () => {
    if (isBusy) return;
    setIsJoining(true);
    try {
      await handleJoin({
        appointmentId: incomingCall.appointmentId,
        callSessionId: incomingCall.callSessionId,
        callType: incomingCall.callType,
        callerName: incomingCall.callerName,
      });
    } finally {
      setIsJoining(false);
    }
  };

  const onConfirmDecline = async () => {
    if (isBusy) return;
    setIsDeclining(true);
    try {
      await handleDecline({
        appointmentId: incomingCall.appointmentId,
        callSessionId: incomingCall.callSessionId,
        isAutoReject: false,
      });
    } finally {
      setIsDeclining(false);
      setConfirmDecline(false);
    }
  };

  return (
    <Modal visible={isShowing} transparent animationType="fade" statusBarTranslucent>
      <Toast />
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Incoming Consultation</Text>

          <Avatar name={displayName.replace(/^dr\.?\s+/i, '')} imageUrl={incomingCall.callerImage} size={88} />

          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.readyText}>{displayName} is ready for your appointment</Text>
          <Text style={styles.subText}>{isVideoCall ? 'Video' : 'Audio'} consultation starting now</Text>

          <View style={styles.timerBlock}>
            <Text style={styles.timerText}>Auto declining in {secondsLeft}s</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, (secondsLeft / totalSeconds) * 100)}%` }]} />
            </View>
          </View>

          {confirmDecline ? (
            <View style={styles.confirmBlock}>
              <Text style={styles.confirmText}>Decline this call?</Text>
              <View style={styles.confirmActions}>
                <Pressable style={styles.confirmCancel} onPress={() => setConfirmDecline(false)} disabled={isBusy}>
                  <Text style={styles.confirmCancelText}>Keep ringing</Text>
                </Pressable>
                <Pressable style={styles.confirmDeclineBtn} onPress={onConfirmDecline} disabled={isBusy}>
                  {isDeclining ? <ActivityIndicator size="small" color={adTokens.white} /> : <Text style={styles.confirmDeclineText}>Decline</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable style={styles.joinButton} onPress={onJoin} disabled={isBusy}>
                <MaterialCommunityIcons name={isVideoCall ? 'video' : 'phone'} size={18} color={adTokens.white} />
                <Text style={styles.joinText}>
                  {isJoining ? 'Joining...' : `Join ${isVideoCall ? 'Video' : 'Audio'} Consultation`}
                </Text>
                {isJoining ? <ActivityIndicator size="small" color={adTokens.white} /> : null}
              </Pressable>
              <Pressable style={styles.declineButton} onPress={() => setConfirmDecline(true)} disabled={isBusy}>
                <MaterialCommunityIcons name="phone-hangup" size={18} color={adTokens.danger} />
                <Text style={styles.declineText}>Decline</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 20, backgroundColor: adTokens.white, paddingVertical: 28, paddingHorizontal: 22, alignItems: 'center', gap: 6 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: adTokens.primary, marginBottom: 10 },
  name: { fontSize: 19, fontWeight: '800', color: adTokens.textPrimary, marginTop: 12 },
  readyText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center', marginTop: 4 },
  subText: { fontSize: 12.5, color: adTokens.textMuted, marginTop: 2, marginBottom: 14 },

  timerBlock: { width: '100%', alignItems: 'center', gap: 8, marginBottom: 18 },
  timerText: { fontSize: 12, color: adTokens.textSecondary },
  progressTrack: { width: '100%', height: 6, borderRadius: 999, backgroundColor: adTokens.gray100, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: adTokens.primary },

  actions: { width: '100%', gap: 10 },
  joinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 999, backgroundColor: adTokens.success },
  joinText: { fontSize: 14.5, fontWeight: '700', color: adTokens.white },
  declineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 999, borderWidth: 1.5, borderColor: adTokens.danger },
  declineText: { fontSize: 14.5, fontWeight: '700', color: adTokens.danger },

  confirmBlock: { width: '100%', alignItems: 'center', gap: 12, paddingTop: 4 },
  confirmText: { fontSize: 14, fontWeight: '600', color: adTokens.textPrimary },
  confirmActions: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  confirmCancelText: { fontSize: 13.5, fontWeight: '600', color: adTokens.textSecondary },
  confirmDeclineBtn: { flex: 1, paddingVertical: 12, borderRadius: 999, backgroundColor: adTokens.danger, alignItems: 'center' },
  confirmDeclineText: { fontSize: 13.5, fontWeight: '700', color: adTokens.white },
});
