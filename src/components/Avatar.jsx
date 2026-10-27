import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { adTokens } from '../theme/colors';

function getInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Round profile picture; falls back to the person's initials when there is no image or it fails
 * to load (web: ImageComponent). */
export default function Avatar({ name, imageUrl, size = 48 }) {
  const [failed, setFailed] = useState(false);
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (imageUrl && !failed) {
    return <Image source={{ uri: imageUrl }} style={shape} onError={() => setFailed(true)} />;
  }
  return (
    <View style={[shape, styles.fallback]}>
      <Text style={[styles.text, { fontSize: size * 0.32 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#279EFF', alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700', color: adTokens.white },
});
