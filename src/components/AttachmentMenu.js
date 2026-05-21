import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Image as ImageIcon,
  Music,
  FileText,
  Smile,
  StickyNote,
  Clapperboard,
} from 'lucide-react-native';

const MENU_ITEMS = [
  { key: 'gallery', label: 'Gallery', icon: ImageIcon, color: '#30D158' },
  { key: 'audio', label: 'Audio', icon: Music, color: '#FF9F0A' },
  { key: 'emojis', label: 'Emojis', icon: Smile, color: '#FFCC00' },
  { key: 'stickers', label: 'Stickers', icon: StickyNote, color: '#AF52DE' },
  { key: 'gifs', label: 'GIFs', icon: Clapperboard, color: '#FF375F' },
];

export const AttachmentMenu = ({ visible, onClose, onSelect }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <BlurView style={StyleSheet.absoluteFill} intensity={80} tint="light" />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.sheetContainer} pointerEvents="auto">
          <View style={styles.menuContainer}>
            {MENU_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  index !== MENU_ITEMS.length - 1 && styles.borderBottom
                ]}
                onPress={() => {
                  onSelect(item.key);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                  <item.icon size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  menuContainer: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.15)',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '500',
    color: '#1B1B1B',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cancelLabel: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
});
