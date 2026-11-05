/**
 * Mirrors AllyDocReactApp's src/constants/ringtones.js. Metro resolves `require()` for an asset
 * statically at build time, so (unlike the web version's `src: '/sounds/...'` string) every
 * ringtone's asset module is required here directly - look up this map by id, never build a path.
 */
export const RINGTONES = [
  { id: 'classic', name: 'Classic', asset: require('../../assets/sounds/ringtone-classic.mp3') },
  { id: 'soft', name: 'Soft', asset: require('../../assets/sounds/ringtone-soft.mp3') },
  { id: 'digital', name: 'Digital', asset: require('../../assets/sounds/ringtone-digital.mp3') },
  { id: 'bell', name: 'Bell', asset: require('../../assets/sounds/ringtone-bell.mp3') },
  { id: 'chime', name: 'Chime', asset: require('../../assets/sounds/ringtone-chime.mp3') },
  { id: 'pulse', name: 'Pulse', asset: require('../../assets/sounds/ringtone-pulse.mp3') },
];

export const DEFAULT_RINGTONE_ID = 'soft';

/** Same storage key the web app uses for its localStorage entry. */
export const RINGTONE_STORAGE_KEY = 'ringtone';

export function getRingtoneById(id) {
  return RINGTONES.find((r) => r.id === id) || RINGTONES.find((r) => r.id === DEFAULT_RINGTONE_ID) || RINGTONES[0];
}
