import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';

/**
 * Sticker Picker
 * Uses Twemoji flat-style sticker images from CDN.
 * Each sticker is a high-res emoji rendered as an image.
 */

const STICKER_EMOJIS = [
  '❤️', '😂', '🥺', '😍', '🔥', '💀',
  '🥰', '😘', '🤗', '😎', '🤩', '💕',
  '👋', '🎉', '✨', '🌸', '💖', '🦋',
  '🐱', '🐶', '🌈', '🍕', '☕', '🎵',
];

// Twemoji CDN - renders Apple-like flat emoji images
const getTwemojiUrl = (emoji) => {
  const codePoints = [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(cp => cp !== 'fe0f')
    .join('-');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoints}.png`;
};

export const StickerPicker = ({ visible, onClose, onSelect }) => {
  const renderSticker = ({ item }) => (
    <TouchableOpacity
      style={styles.stickerItem}
      onPress={() => onSelect(getTwemojiUrl(item), item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getTwemojiUrl(item) }}
        style={styles.stickerImage}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Stickers</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#5D5E60" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={STICKER_EMOJIS}
            renderItem={renderSticker}
            keyExtractor={(item, index) => `${item}-${index}`}
            numColumns={4}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  container: {
    height: '45%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Metropolis',
    fontSize: 18,
    fontWeight: '700',
    color: '#1B1B1B',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  gridContent: {
    paddingBottom: 30,
    paddingHorizontal: 8,
  },
  stickerItem: {
    width: '22%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stickerImage: {
    width: 64,
    height: 64,
  },
});
