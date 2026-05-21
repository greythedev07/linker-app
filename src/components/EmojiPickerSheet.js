import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { X, Smile, LayoutGrid } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { getAppleEmojiUrl } from './EmojiText';

/**
 * Custom Apple-style Emoji Picker
 * Uses Twemoji CDN to render Apple-like emojis as images on all platforms.
 */

const CATEGORIES = [
  { key: 'recents', label: '🕒', emojis: ['😀','❤️','😂','👍','🔥','✨','🥺','🥰'] },
  { key: 'smileys', label: '😀', emojis: [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
    '😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
    '🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢',
    '🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏',
    '😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷',
    '🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠',
    '🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','😮',
    '😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥',
    '😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱',
  ]},
  { key: 'hearts', label: '❤️', emojis: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
    '❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝',
    '💟','♥️','💋','👄','👅','🫦',
  ]},
  { key: 'hands', label: '👋', emojis: [
    '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌',
    '🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉',
    '👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛',
    '🤜','👏','🙌','🫶','👐','🤲','🤝','🙏',
  ]},
  { key: 'animals', label: '🐱', emojis: [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨',
    '🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔',
    '🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴',
    '🦄','🐝','🪱','🐛','🦋','🐌','🐞','扛','🪰','🪲',
  ]},
  { key: 'food', label: '🍕', emojis: [
    '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈',
    '🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🫛',
    '🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅',
    '🍕','🍔','🍟','🌭','ポップコーン','🧂','🥚','🍳','バター','🥞',
  ]},
  { key: 'travel', label: '✈️', emojis: [
    '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐',
    '🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛹','✈️',
    '🚀','🛸','🚁','⛵','🚤','🛳️','🌍','🌎','🌏','🗺️',
  ]},
  { key: 'objects', label: '💡', emojis: [
    '⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','💿','💾','📷',
    '📹','🎥','📞','☎️','テレビ','ラジオ','マイク','🎚️','🎛️','⏱️',
    '💡','🔦','🕯️','📔','📕','📖','📗','📘','📙','📚',
  ]},
  { key: 'symbols', label: '⭐', emojis: [
    '⭐','🌟','✨','💫','🔥','💥','❄️','🌈','☀️','🌤️',
    '⛅','🌦️','🌧️','⛈️','🌩️','🌪️','🌫️','🌊','💧','💦',
    '🎵','🎶','🎤','🎧','🎼','ピアノ','🥁','🎷','🎺','ギター',
  ]},
];



export const EmojiPickerSheet = ({ visible, onClose, onSelect }) => {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const currentEmojis = CATEGORIES.find(c => c.key === activeCategory)?.emojis || [];

  const renderEmoji = ({ item }) => (
    <TouchableOpacity
      style={[styles.emojiItem, { width: (screenWidth * 0.85 - 20) / 6 }]}
      onPress={() => onSelect(item)}
      activeOpacity={0.6}
    >
      <Image
        source={{ uri: getAppleEmojiUrl(item) }}
        style={styles.emojiImage}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dimmed Background */}
      <Pressable style={styles.modalBackground} onPress={onClose}>
        <BlurView style={StyleSheet.absoluteFill} intensity={80} tint="light" />
      </Pressable>

      <View style={styles.overlay} pointerEvents="box-none">
        {/* Frosted Glass Container */}
        <BlurView 
          style={[styles.container, { width: screenWidth * 0.85, height: screenHeight * 0.65 }]} 
          intensity={95} 
          tint="light"
        >
          {/* Top Control Row */}
          <View style={styles.controlRow}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <X size={18} color="#5D5E60" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <LayoutGrid size={18} color="#5D5E60" />
            </TouchableOpacity>
          </View>

          {/* Emoji Grid */}
          <FlatList
            data={currentEmojis}
            renderItem={renderEmoji}
            keyExtractor={(item, index) => `${item}-${index}`}
            numColumns={6}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Category Tabs (Bottom) */}
          <View style={styles.footer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryContent}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryTab,
                    activeCategory === cat.key && styles.categoryTabActive,
                  ]}
                  onPress={() => setActiveCategory(cat.key)}
                >
                  <Image
                    source={{ uri: getAppleEmojiUrl(cat.label) }}
                    style={styles.categoryIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 120,
  },
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 20,
  },
  emojiItem: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  emojiImage: {
    width: 36,
    height: 36,
  },
  footer: {
    height: 48,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  categoryContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 12,
  },
  categoryTab: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTabActive: {
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  categoryIcon: {
    width: 22,
    height: 22,
  },
});
