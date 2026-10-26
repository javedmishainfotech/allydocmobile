import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { splitTextWithLinks } from '../../utils/legalTextParser';
import { openExternalLink } from '../../utils/openExternalLink';

/** Renders text that may contain URLs, making each URL tappable. */
function LinkedText({ text, style }) {
  const segments = splitTextWithLinks(text);
  return (
    <Text style={style}>
      {segments.map((segment, index) =>
        segment.href ? (
          <Text key={index} style={styles.link} onPress={() => openExternalLink(segment.href)}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
}

/**
 * Renders parsed legal-text blocks (see utils/legalTextParser.js) inside the
 * bordered scroll box used by the consent agreement and the IDP disclaimer.
 * The box is a nested-scroll-free fixed block: the whole screen scrolls.
 */
export default function LegalTextView({ blocks }) {
  return (
    <View style={styles.box}>
      {blocks.map((block, index) => {
        if (block.type === 'gap') return <View key={index} style={styles.gap} />;
        if (block.type === 'heading') return <LinkedText key={index} text={block.text} style={styles.heading} />;
        if (block.type === 'intro') return <Text key={index} style={styles.intro}>{block.text}</Text>;
        if (block.type === 'subitem') return <LinkedText key={index} text={block.text} style={styles.subitem} />;
        return <LinkedText key={index} text={block.text} style={styles.line} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 10,
    backgroundColor: '#fafafa',
  },
  heading: { fontWeight: '700', color: '#0b5ed7', marginTop: 12, marginBottom: 4, fontSize: 14, lineHeight: 21 },
  intro: { fontWeight: '600', color: '#334155', marginBottom: 6, fontSize: 13.5, lineHeight: 22 },
  line: { color: '#334155', fontSize: 13.5, lineHeight: 22, marginBottom: 4 },
  subitem: { color: '#334155', fontSize: 13.5, lineHeight: 22, marginBottom: 4, marginLeft: 12 },
  gap: { height: 10 },
  link: { color: '#0b5ed7', textDecorationLine: 'underline' },
});
