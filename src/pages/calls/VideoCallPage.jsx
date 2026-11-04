import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler, Modal, ScrollView } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Daily, { DailyMediaView } from '@daily-co/react-native-daily-js';
import { useAuth } from '../../hooks/useAuth';
import { startAppointmentCall, startCallRecording, stopCallRecording, pickCallSessionId } from '../../services/callService';
import { toast } from '../../utils/toast';
import { adTokens, colors } from '../../theme/colors';

function getRoleForRecording(roleName) {
  const role = String(roleName || '').toLowerCase().trim();
  // Doctor sub / doctor admin behave like "doctor" for who controls recording, same as web.
  if (role === 'doctor admin' || role === 'doctor sub') return 'doctor';
  return role;
}

// TEMP: on-screen call diagnostics (the APK runs without Metro, so console.log is not visible). Set to false / remove once the call video issue is sorted.
const SHOW_CALL_DEBUG = true;

// readyState / muted / enabled of a MediaStreamTrack. `muted:true` on a "playable" track means no frames are arriving.
function describeTrack(track) {
  if (!track) return 'none';
  return `${track.readyState}/m:${track.muted ? 1 : 0}/e:${track.enabled ? 1 : 0}`;
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Renders one participant's video (+ audio, for the remote tile only - a local tile never
 * plays back its own mic to avoid echo). Uses Daily's own `DailyMediaView` - the component the
 * SDK itself ships for this - instead of hand-rolling react-native-webrtc's RTCView/MediaStream,
 * which also means remote audio is now actually attached/played (the previous hand-rolled tile
 * only ever wired up video tracks, so remote audio never played on Android). */
function VideoTile({ videoTrack, audioTrack, label, mirrored, cameraOff, muted, isLocal }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  if (cameraOff) {
    return (
      <View style={[styles.tile, styles.tileEmpty]}>
        <MaterialCommunityIcons name="account-circle" size={56} color="rgba(255,255,255,0.5)" />
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
    );
  }
  // DailyMediaView (an Android SurfaceView under the hood) stays black when it only gets its size from
  // `absoluteFill` (confirmed on device: frames arrived, tracks live and unmuted, nothing drawn). Giving it
  // the tile's measured pixel width/height makes it draw.
  return (
    <View style={styles.tile} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w > 0 ? (
        <DailyMediaView
          key={videoTrack?.id || 'no-track'}
          videoTrack={videoTrack}
          audioTrack={audioTrack}
          style={{ width: size.w, height: size.h }}
          objectFit="contain"
          mirror={mirrored}
          zOrder={isLocal ? 1 : 0}
        />
      ) : null}
      <Text style={styles.tileLabel}>{muted ? `${label} (muted)` : label}</Text>
    </View>
  );
}

function ParticipantRow({ participant, isSelf }) {
  const micOn = participant?.tracks?.audio?.state === 'playable' || participant?.tracks?.audio?.state === 'sendable';
  const videoOn = participant?.tracks?.video?.state === 'playable' || participant?.tracks?.video?.state === 'sendable';
  return (
    <View style={styles.peopleRow}>
      <View style={styles.peopleAvatar}>
        <MaterialCommunityIcons name="account" size={20} color={adTokens.primaryDark} />
      </View>
      <Text style={styles.peopleName} numberOfLines={1}>
        {isSelf ? 'You' : participant?.user_name || 'Participant'}
      </Text>
      <Feather name={micOn ? 'mic' : 'mic-off'} size={15} color={micOn ? 'rgba(255,255,255,0.85)' : adTokens.danger} />
      <Feather name={videoOn ? 'video' : 'video-off'} size={15} color={videoOn ? 'rgba(255,255,255,0.85)' : adTokens.danger} />
    </View>
  );
}

/**
 * Port of AllyDocReactApp's Daily_Co/VideoCallModal + VideoCall. Web uses Daily's Prebuilt
 * iframe UI wholesale (`DailyIframe.createFrame(..., { showLeaveButton: true })` - no app-owned
 * button JSX at all); react-native-daily-js explicitly doesn't support Prebuilt
 * (https://docs.daily.co/docs/react-native), so this screen reimplements Prebuilt's default
 * feature set by hand on top of the same headless call object: mic/camera toggle, camera flip,
 * a people panel, a participant-count + recording indicator header, and leave - plus the app's
 * own logic that sits on top of Prebuilt on web: the 30s "participant left" reconnect countdown,
 * doctor-only auto-recording+transcription once two participants are joined, and the same
 * `StartAppointmentCall`/start-stop-recording backend calls.
 */
export default function VideoCallPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { appointmentId, isAudio = false, counterpartName } = route.params || {};
  const shouldControlRecording = getRoleForRecording(profile?.roleName) === 'doctor';

  const [isLoading, setIsLoading] = useState(true);
  const [joinError, setJoinError] = useState('');
  const [localParticipant, setLocalParticipant] = useState(null);
  const [remoteParticipant, setRemoteParticipant] = useState(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(isAudio);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const [debugLines, setDebugLines] = useState([]);
  const lastDebugRef = useRef('');
  const pushDebug = (text) => {
    if (!SHOW_CALL_DEBUG || text === lastDebugRef.current) return;
    lastDebugRef.current = text;
    const t = new Date().toTimeString().slice(0, 8);
    setDebugLines((prev) => [...prev.slice(-9), `${t} ${text}`]);
  };

  const callRef = useRef(null);
  const roomNameRef = useRef('');
  const callSessionIdRef = useRef('');
  const recordingStartedRef = useRef(false);
  const transcriptionStartedRef = useRef(false);
  const didTriggerStopRef = useRef(false);
  const didLeaveRef = useRef(false);
  const timerRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const triggerStopRecordingOnce = () => {
    if (!shouldControlRecording || didTriggerStopRef.current) return;
    if (!roomNameRef.current || !appointmentId) return;
    didTriggerStopRef.current = true;
    stopCallRecording(roomNameRef.current, appointmentId);
  };

  const startRecordingTimer = () => {
    setRecordingSeconds(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
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

  // Mirrors Daily Prebuilt's own default "Stop" recording tray control, which web's doctor can
  // already use even though the app never wires a manual *start* - only a manual stop.
  const stopRecordingManually = async () => {
    const call = callRef.current;
    if (!call || !recordingStartedRef.current) return;
    try {
      await call.stopRecording();
    } catch (error) {
      // best-effort
    }
  };

  const leaveCall = async () => {
    if (didLeaveRef.current) return;
    didLeaveRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    stopRecordingTimer();
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

  const refreshParticipants = () => {
    const call = callRef.current;
    if (!call) return;
    const participants = call.participants() || {};
    const local = participants.local || null;
    const remote = Object.values(participants).find((p) => !p.local) || null;
    const joinedCount = Object.values(participants).filter((p) => p.local || p.session_id).length;

    console.log(
      '[call] refreshParticipants - local video:',
      local?.tracks?.video?.state,
      '| remote video:',
      remote?.tracks?.video?.state,
      '| remote video subscribed:',
      remote?.tracks?.video?.subscribed,
      '| remote audio:',
      remote?.tracks?.audio?.state,
      '| count:',
      joinedCount,
    );

    pushDebug(
      `L vid:${local?.tracks?.video?.state} aud:${local?.tracks?.audio?.state} | R vid:${remote?.tracks?.video?.state} sub:${remote?.tracks?.video?.subscribed} trk:${remote?.tracks?.video?.persistentTrack ? 'y' : 'n'} aud:${remote?.tracks?.audio?.state} | n:${joinedCount}` +
        ` | rT:${describeTrack(remote?.tracks?.video?.persistentTrack)} lT:${describeTrack(local?.tracks?.video?.persistentTrack)}`,
    );
    setLocalParticipant(local);
    setRemoteParticipant(remote);
    setParticipantCount(joinedCount);
    setIsMicMuted(local?.tracks?.audio?.state !== 'playable' && local?.tracks?.audio?.state !== 'sendable');
    // Keep the camera button / self tile in step with the real camera (permission denied, OS stopped
    // it, ...) instead of only what the button last toggled.
    const localVideoState = local?.tracks?.video?.state;
    if (localVideoState) setIsCameraOff(localVideoState === 'off' || localVideoState === 'blocked');
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
        refreshParticipants();
        tryStartRecordingWhenTwoJoined();
      });
      call.on('participant-joined', () => {
        refreshParticipants();
        cancelCountdown();
        tryStartRecordingWhenTwoJoined();
      });
      call.on('participant-updated', refreshParticipants);
      call.on('track-started', (e) => {
        pushDebug(`track-started ${e?.participant?.local ? 'LOCAL' : 'remote'} ${e?.track?.kind}`);
        refreshParticipants();
      });
      call.on('track-stopped', (e) => {
        pushDebug(`track-stopped ${e?.participant?.local ? 'LOCAL' : 'remote'} ${e?.track?.kind}`);
        refreshParticipants();
      });
      call.on('camera-error', (e) => pushDebug(`CAMERA-ERROR ${e?.errorMsg?.errorMsg || e?.error?.type || ''} ${e?.errorMsg?.audioOk === false ? 'audio-denied' : ''} ${e?.errorMsg?.videoOk === false ? 'video-denied' : ''}`));
      call.on('nonfatal-error', (e) => pushDebug(`NONFATAL ${e?.type || ''} ${e?.errorMsg || ''}`));
      call.on('participant-left', () => {
        refreshParticipants();
        startCountdown();
      });
      call.on('left-meeting', () => {
        triggerStopRecordingOnce();
      });
      call.on('recording-started', () => {
        recordingStartedRef.current = true;
        setIsRecording(true);
        startRecordingTimer();
      });
      call.on('recording-stopped', () => {
        recordingStartedRef.current = false;
        setIsRecording(false);
        stopRecordingTimer();
      });
      call.on('recording-error', () => {
        recordingStartedRef.current = false;
        setIsRecording(false);
        stopRecordingTimer();
      });
      call.on('transcription-stopped', () => {
        transcriptionStartedRef.current = false;
      });
      call.on('transcription-error', () => {
        transcriptionStartedRef.current = false;
      });
      call.on('error', (event) => {
        const message = event?.errorMsg || event?.error?.msg || 'Unable to join the call.';
        pushDebug(`ERROR ${message}`);
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
      stopRecordingTimer();
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

  const flipCamera = async () => {
    const call = callRef.current;
    if (!call) return;
    try {
      await call.cycleCamera();
    } catch (error) {
      toast.error('Could not switch camera.');
    }
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

  const remoteVideoTrack = remoteParticipant?.tracks?.video?.persistentTrack || null;
  const remoteAudioTrack = remoteParticipant?.tracks?.audio?.persistentTrack || null;
  // `persistentTrack` can exist while the video is not actually playable (loading / interrupted / off),
  // which rendered a black tile - show the avatar unless the track is really playable.
  const remoteCameraOff = !remoteVideoTrack || remoteParticipant?.tracks?.video?.state !== 'playable';
  const remoteMuted = remoteParticipant?.tracks?.audio?.state !== 'playable' && remoteParticipant?.tracks?.audio?.state !== 'sendable';
  const localVideoTrack = localParticipant?.tracks?.video?.persistentTrack || null;
  const remoteName = remoteParticipant?.user_name || counterpartName || 'Participant';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerPill}>
          <Feather name="users" size={13} color={colors.white} />
          <Text style={styles.headerPillText} numberOfLines={1}>
            {participantCount} in call
          </Text>
        </View>
        {isRecording ? (
          <Pressable
            style={styles.recordingPill}
            onPress={shouldControlRecording ? stopRecordingManually : undefined}
            disabled={!shouldControlRecording}
          >
            <View style={styles.recordingDot} />
            <Text style={styles.headerPillText} numberOfLines={1}>
              Rec {formatElapsed(recordingSeconds)}
            </Text>
            {shouldControlRecording ? <Feather name="square" size={11} color={colors.white} style={styles.recordingStopIcon} /> : null}
          </Pressable>
        ) : null}
        <Pressable style={styles.headerIconButton} onPress={() => setPeopleOpen(true)}>
          <Feather name="users" size={16} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.stage}>
        <VideoTile videoTrack={remoteVideoTrack} audioTrack={remoteAudioTrack} label={remoteName} cameraOff={remoteCameraOff} muted={remoteMuted} isLocal={false} />
        {!isAudio ? (
          <View style={styles.selfTileWrap}>
            <VideoTile videoTrack={localVideoTrack} audioTrack={null} label="You" mirrored cameraOff={isCameraOff} muted={isMicMuted} isLocal />
          </View>
        ) : null}
      </View>

      {SHOW_CALL_DEBUG && debugLines.length ? (
        <View pointerEvents="none" style={styles.debugBox}>
          {debugLines.map((line, i) => (
            <Text key={`${i}-${line}`} style={styles.debugText}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={[styles.controls, { paddingBottom: 20 + insets.bottom }]}>
        <Pressable style={[styles.controlButton, isMicMuted && styles.controlButtonActive]} onPress={toggleMic}>
          <Feather name={isMicMuted ? 'mic-off' : 'mic'} size={20} color={colors.white} />
        </Pressable>
        {!isAudio ? (
          <>
            <Pressable style={[styles.controlButton, isCameraOff && styles.controlButtonActive]} onPress={toggleCamera}>
              <Feather name={isCameraOff ? 'video-off' : 'video'} size={20} color={colors.white} />
            </Pressable>
            <Pressable style={styles.controlButton} onPress={flipCamera} disabled={isCameraOff}>
              <MaterialCommunityIcons name="camera-flip-outline" size={21} color={isCameraOff ? 'rgba(255,255,255,0.35)' : colors.white} />
            </Pressable>
          </>
        ) : null}
        <Pressable style={styles.endButton} onPress={leaveCall}>
          <Feather name="phone-off" size={20} color={colors.white} />
        </Pressable>
      </View>

      <Modal visible={peopleOpen} transparent animationType="fade" onRequestClose={() => setPeopleOpen(false)}>
        <Toast />
        <Pressable style={styles.peopleOverlay} onPress={() => setPeopleOpen(false)}>
          <Pressable style={styles.peopleSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.peopleHeader}>
              <Text style={styles.peopleTitle}>People ({participantCount})</Text>
              <Pressable onPress={() => setPeopleOpen(false)} hitSlop={8}>
                <Feather name="x" size={20} color={colors.white} />
              </Pressable>
            </View>
            <ScrollView style={styles.peopleList}>
              {localParticipant ? <ParticipantRow participant={localParticipant} isSelf /> : null}
              {remoteParticipant ? <ParticipantRow participant={remoteParticipant} /> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(11,15,25,0.9)',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  recordingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.25)',
  },
  recordingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: adTokens.danger },
  recordingStopIcon: { marginLeft: 2 },
  headerPillText: { color: colors.white, fontSize: 11.5, fontWeight: '700' },
  headerIconButton: { marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },

  debugBox: { position: 'absolute', left: 6, right: 6, bottom: 110, padding: 6, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.72)', zIndex: 20, elevation: 20 },
  debugText: { color: '#A7F3D0', fontSize: 9.5, lineHeight: 12 },
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
    // No borderRadius / overflow:'hidden' here: clipping an Android SurfaceView (the video) can render it black.
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
    backgroundColor: '#0B0F19',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  controlButtonActive: { backgroundColor: adTokens.dangerDark },
  endButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adTokens.danger,
  },

  peopleOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  peopleSheet: { backgroundColor: '#111827', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '60%', paddingBottom: 20 },
  peopleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  peopleTitle: { color: colors.white, fontSize: 15, fontWeight: '700' },
  peopleList: { paddingHorizontal: 16 },
  peopleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  peopleAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  peopleName: { flex: 1, color: colors.white, fontSize: 13.5, fontWeight: '600' },

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
