import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import emojiRegex from 'emoji-regex';

/**
 * EmojiText Component
 * Parses text and replaces unicode emojis with high-quality Apple-style images
 * from the emoji-datasource-apple CDN.
 */

// CDN for Apple Emojis
const APPLE_EMOJI_CDN = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/';

export const getAppleEmojiUrl = (emoji) => {
  const codePoint = [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .join('-');
  return `${APPLE_EMOJI_CDN}${codePoint}.png`;
};

export const EmojiText = ({ children, style, emojiSize = 20, ...props }) => {
  if (typeof children !== 'string') {
    return <Text style={style} {...props}>{children}</Text>;
  }

  const regex = emojiRegex();
  // Wrap in capture group to keep the emojis in the split array
  const splitRegex = new RegExp(`(${regex.source})`, 'g');
  const parts = children.split(splitRegex);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
      {parts.map((part, index) => {
        if (regex.test(part)) {
          const imageUrl = getAppleEmojiUrl(part);
          
          return (
            <Image
              key={`${index}-${part}`}
              source={{ uri: imageUrl }}
              style={[styles.emoji, { width: emojiSize, height: emojiSize }]}
              resizeMode="contain"
            />
          );
        }
        if (part === '') return null;
        return <Text key={index} style={style} {...props}>{part}</Text>;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  emoji: {
    // Add a small margin or offset if needed to align with text
    transform: [{ translateY: 2 }],
  },
});
