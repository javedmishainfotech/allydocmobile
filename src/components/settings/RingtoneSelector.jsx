import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Feather } from '@expo/vector-icons';
import { RINGTONES, DEFAULT_RINGTONE_ID, RINGTONE_STORAGE_KEY, getRingtoneById } from '../../constants/ringtones';
import { getItem, setItem } from '../../utils/storage';
import { adTokens } from '../../theme/colors';

const PREVIEW_DURATION_MS = 2500;

/** Port of AllyDocReactApp's RingtoneSelector: a non-intrusive picker (chip row here instead of a
 * <select>) that previews the selected tone and persists the choice for the incoming-call ring
 * (IncomingCallModal reads the same storage key to pick the ringtone it plays). */
export default function RingtoneSelector() {
  const [selectedId, setSelectedId] = useState(DEFAULT_RINGTONE_ID);
  const player = useAudioPlayer(null);
  const previewTimeout = useRef(null);

  useEffect(() => {
    getItem(RINGTONE_STORAGE_KEY).then((stored) => {
      if (stored) setSelectedId(stored);
    });
    return () => {
      if (previewTimeout.current) clearTimeout(previewTimeout.current);
      player.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectRingtone = (id) => {
    setSelectedId(id);
    setItem(RINGTONE_STORAGE_KEY, id);
  };

  const previewRingtone = () => {
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    const ringtone = getRingtoneById(selectedId);
    player.replace(ringtone.asset);
    player.seekTo(0);
    player.play();
    previewTimeout.current = setTimeout(() => player.pause(), PREVIEW_DURATION_MS);
  };

  return (
    <View>
      <View style={styles.row}>
        {RINGTONES.map((ringtone) => {
          const active = ringtone.id === selectedId;
          return (
            <Pressable
              key={ringtone.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => selectRingtone(ringtone.id)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{ringtone.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable style={styles.previewButton} onPress={previewRingtone}>
        <Feather name="play" size={14} color={adTokens.primaryDark} />
        <Text style={styles.previewText}>Preview</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  chipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  chipTextActive: { color: adTokens.white },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adTokens.primary,
  },
  previewText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },
});
