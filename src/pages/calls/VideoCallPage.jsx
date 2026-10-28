import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Daily from '@daily-co/react-native-daily-js';
import { RTCView, MediaStream } from '@daily-co/react-native-webrtc';
import { useAuth } from '../../hooks/useAuth';
import { startAppointmentCall, startCallRecording, stopCallRecording, pickCallSessionId } from '../../services/callService';
import { toast } from '../../utils/toast';
import { adTokens, colors } from '../../theme/colors';

const DOCTOR_ENDED_REASONS = new Set(['doctor_left', 'doctor_cancelled']);

function getRoleForRecording(roleName) {
  const role = String(roleName || '').toLowerCase().trim();
  // Doctor sub / doctor admin behave like "doctor" for who controls recording, same as web.
  if (role === 'doctor admin' || role === 'doctor sub') return 'doctor';
  return role;
}

function VideoTile({ track, label, mirrored, muted }) {
  // RTCView renders a MediaStream (via its .toURL()), not a bare MediaStreamTrack - wrap the
  // persistentTrack Daily hands back before handing it to react-native-webrtc.
  const streamUrl = useMemo(() => {
    if (!track) return null;
    try {
      return new MediaStream([track]).toURL();
    } catch (error) {
      return null;
    }
  }, [track]);

  if (!streamUrl) {
    return (
      <View style={[styles.tile, styles.tileEmpty]}>
        <MaterialCommunityIcons name="account-circle" size={56} color="rgba(255,255,255,0.5)" />
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={styles.tile}>
      <RTCView streamURL={streamUrl} style={styles.tileVideo} objectFit="cover" mirror={mirrored} zOrder={mirrored ? 1 : 0} />
      <Text style={styles.tileLabel}>{muted ? `${label} (muted)` : label}</Text>
    </View>
  );
}

/**
 * Port of AllyDocReactApp's Daily_Co/VideoCallModal + VideoCall (web wraps Daily's embeddable
 * iframe; React Native has no Prebuilt UI, so this builds its own minimal tiles with
 * react-native-webrtc's RTCView around the same headless call object -
 * https://docs.daily.co/docs/react-native explicitly says Prebuilt "is not supported in
 * react-native-daily-js"). Same backend calls (`StartAppointmentCall`, start/stop-recording),
 * same doctor-only auto-recording+transcription once two participants are joined, and the same
 * 30s "participant left" reconnect countdown before ending the call.
 */
export default function VideoCallPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const { profile } = useAuth();
  const { appointmentId, isAudio = false, counterpartName } = route.params || {};
  const shouldControlRecording = getRoleForRecording(profile?.roleName) === 'doctor';

  const [isLoading, setIsLoading] = useState(true);
  const [joinError, setJoinError] = useState('');
  const [localTrack, setLocalTrack] = useState(null);
  const [remoteTrack, setRemoteTrack] = useState(null);
  const [remoteName, setRemoteName] = useState(counterpartName || 'Participant');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(isAudio);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const callRef = useRef(null);
  const roomNameRef = useRef('');
  const callSessionIdRef = useRef('');
  const recordingStartedRef = useRef(false);
  const transcriptionStartedRef = useRef(false);
  const didTriggerStopRef = useRef(false);
  const didLeaveRef = useRef(false);
  const timerRef = useRef(null);

  const triggerStopRecordingOnce = () => {
    if (!shouldControlRecording || didTriggerStopRef.current) return;
    if (!roomNameRef.current || !appointmentId) return;
    didTriggerStopRef.current = true;
    stopCallRecording(roomNameRef.current, appointmentId);
  };

  const tryStartRecordingWhenTwoJoined = () => {
    if (!shouldControlRecording || !callRef.current) return;
    const participants = callRef.current.participants();
    const joined = Object.values(participants || {}).filter((p) => p.session_id);
    if (joined.length !== 2) return;

    if (!recordingStartedRef.current) {
      recordingStartedRef.current = true;
      try {
        callRef.current.startRecording();
        if (roomNameRef.current) startCallRecording(roomNameRef.current);
      } catch (error) {
        recordingStartedRef.current = false;
      }
    }
    if (!transcriptionStartedRef.current) {
      transcriptionStartedRef.current = true;
      try {
        callRef.current.startTranscription();
      } catch (error) {
        transcriptionStartedRef.current = false;
      }
    }
  };

  const leaveCall = async () => {
    if (didLeaveRef.current) return;
    didLeaveRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    triggerStopRecordingOnce();
    const call = callRef.current;
    if (call) {
      try {
        if (shouldControlRecording && recordingStartedRef.current) await call.stopRecording();
        if (shouldControlRecording && transcriptionStartedRef.current) await call.stopTranscription();
        await call.leave();
        call.destroy();
      } catch (error) {
        // best-effort cleanup
      }
    }
    if (navigation.canGoBack()) navigation.goBack();
  };

  const startCountdown = () => {
    setShowReconnectModal(true);
    setCountdown(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          leaveCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowReconnectModal(false);
  };

  const refreshTracks = () => {
    const call = callRef.current;
    if (!call) return;
    const participants = call.participants() || {};
    const local = participants.local;
    setLocalTrack(local?.tracks?.video?.persistentTrack || null);
    setIsMicMuted(local?.tracks?.audio?.state !== 'playable' && local?.tracks?.audio?.state !== 'sendable');

    const remote = Object.values(participants).find((p) => !p.local);
    if (remote) {
      setRemoteTrack(remote.tracks?.video?.persistentTrack || null);
      setRemoteName(remote.user_name || counterpartName || 'Participant');
    } else {
      setRemoteTrack(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const join = async () => {
      setIsLoading(true);
      const callType = isAudio ? 'audio' : 'video';
      const result = await startAppointmentCall(appointmentId, callType);
      if (cancelled) return;
      if (!result.success || !result.data?.url) {
        setJoinError(result.message || 'Video call has not been started yet by the doctor.');
        setIsLoading(false);
        return;
      }
      const roomUrl = result.data.url;
      const token = result.data.token;
      roomNameRef.current = String(roomUrl).split('/').filter(Boolean).pop() || '';
      callSessionIdRef.current = pickCallSessionId(result.data) || pickCallSessionId(result.raw) || '';

      const call = Daily.createCallObject();
      callRef.current = call;

      call.on('joined-meeting', () => {
        refreshTracks();
        tryStartRecordingWhenTwoJoined();
      });
      call.on('participant-joined', () => {
        refreshTracks();
        cancelCountdown();
        tryStartRecordingWhenTwoJoined();
      });
      call.on('participant-updated', refreshTracks);
      call.on('participant-left', () => {
        refreshTracks();
        startCountdown();
      });
      call.on('left-meeting', () => {
        triggerStopRecordingOnce();
      });
      call.on('recording-stopped', () => {
        recordingStartedRef.current = false;
      });
      call.on('recording-error', () => {
        recordingStartedRef.current = false;
      });
      call.on('transcription-stopped', () => {
        transcriptionStartedRef.current = false;
      });
      call.on('transcription-error', () => {
        transcriptionStartedRef.current = false;
      });
      call.on('error', (event) => {
        const message = event?.errorMsg || event?.error?.msg || 'Unable to join the call.';
        toast.error(message);
      });

      try {
        await call.join({ url: roomUrl, token, videoSource: !isAudio, audioSource: true });
        setIsLoading(false);
      } catch (error) {
        if (!cancelled) {
          setJoinError(error?.errorMsg || 'Unable to join the call.');
          setIsLoading(false);
        }
      }
    };

    join();

    return () => {
      cancelled = true;
      const call = callRef.current;
      if (call) {
        try {
          call.leave();
          call.destroy();
        } catch (error) {
          // best-effort cleanup
        }
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, isAudio]);

  useEffect(() => {
    const onBackPress = () => {
      leaveCall();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = () => {
    const call = callRef.current;
    if (!call) return;
    const next = !isMicMuted;
    call.setLocalAudio(!next);
    setIsMicMuted(next);
  };

  const toggleCamera = () => {
    const call = callRef.current;
    if (!call) return;
    const next = !isCameraOff;
    call.setLocalVideo(!next);
    setIsCameraOff(next);
  };

  if (joinError) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="phone-off-outline" size={36} color={colors.white} />
        <Text style={styles.errorText}>{joinError}</Text>
        <Pressable style={styles.leaveButton} onPress={() => navigation.goBack()}>
          <Text style={styles.leaveButtonText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.white} />
        <Text style={styles.loadingText}>Connecting...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <VideoTile track={remoteTrack} label={remoteName} />
        {!isAudio ? (
          <View style={styles.selfTileWrap}>
            <VideoTile track={isCameraOff ? null : localTrack} label="You" mirrored muted={isMicMuted} />
          </View>
        ) : null}
      </View>

      <View style={styles.controls}>
        <Pressable style={[styles.controlButton, isMicMuted && styles.controlButtonActive]} onPress={toggleMic}>
          <Feather name={isMicMuted ? 'mic-off' : 'mic'} size={20} color={colors.white} />
        </Pressable>
        {!isAudio ? (
          <Pressable style={[styles.controlButton, isCameraOff && styles.controlButtonActive]} onPress={toggleCamera}>
            <Feather name={isCameraOff ? 'video-off' : 'video'} size={20} color={colors.white} />
          </Pressable>
        ) : null}
        <Pressable style={styles.endButton} onPress={leaveCall}>
          <Feather name="phone-off" size={20} color={colors.white} />
        </Pressable>
      </View>

      {showReconnectModal ? (
        <View style={styles.reconnectOverlay}>
          <View style={styles.reconnectBox}>
            <Text style={styles.reconnectTitle}>Participant Left</Text>
            <Text style={styles.reconnectBody}>
              The other participant has either lost connection or left the call. If they do not rejoin within the next{' '}
              {countdown}s, the call will be disconnected.
            </Text>
            <Pressable style={styles.leaveButton} onPress={leaveCall}>
              <Text style={styles.leaveButtonText}>Disconnect Now</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0F19' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: '#0B0F19' },
  loadingText: { color: colors.white, fontSize: 13.5 },
  errorText: { color: colors.white, fontSize: 14, textAlign: 'center' },
  stage: { flex: 1 },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  tileEmpty: { gap: 8 },
  tileVideo: { ...StyleSheet.absoluteFillObject },
  tileLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  selfTileWrap: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 20,
    backgroundColor: '#0B0F19',
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  controlButtonActive: { backgroundColor: adTokens.dangerDark },
  endButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adTokens.danger,
  },
  reconnectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  reconnectBox: { backgroundColor: colors.white, borderRadius: 14, padding: 18, gap: 12, maxWidth: 360 },
  reconnectTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  reconnectBody: { fontSize: 13, color: adTokens.textSecondary, lineHeight: 19 },
  leaveButton: { alignSelf: 'flex-end', backgroundColor: adTokens.danger, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10 },
  leaveButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
