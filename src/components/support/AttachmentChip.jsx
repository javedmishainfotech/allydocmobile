import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { fileMeta, attachmentIcon, formatFileSize } from '../../utils/supportFields';
import { openAttachment } from '../../services/supportService';
import { adTokens } from '../../theme/colors';

/** One attachment: a remove button while composing, or tap-to-open for a saved server attachment. */
export default function AttachmentChip({ attachment, onRemove, disabled }) {
  const { name, size } = fileMeta(attachment);
  const canOpen = !onRemove && Boolean(attachment.id);

  return (
    <Pressable style={styles.chip} onPress={canOpen ? () => openAttachment(attachment) : undefined} disabled={!canOpen}>
      <MaterialCommunityIcons name={attachmentIcon(attachment)} size={18} color={adTokens.primaryDark} />
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      {size ? <Text style={styles.size}>{formatFileSize(size)}</Text> : null}
      {onRemove ? (
        <Pressable onPress={onRemove} disabled={disabled} hitSlop={8}>
          <Feather name="x" size={14} color={adTokens.textSecondary} />
        </Pressable>
      ) : canOpen ? (
        <Feather name="external-link" size={14} color={adTokens.primaryDark} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.gray50,
  },
  name: { flex: 1, fontSize: 12.5, color: adTokens.textPrimary, fontWeight: '600' },
  size: { fontSize: 11, color: adTokens.textSecondary },
});
