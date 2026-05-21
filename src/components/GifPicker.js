import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Search, X } from 'lucide-react-native';

/**
 * GIF Picker powered by Tenor API v2 (free tier).
 * Uses the public Tenor API key for basic access.
 */

const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Google's public Tenor key
const TENOR_BASE = 'https://tenor.googleapis.com/v2';

export const GifPicker = ({ visible, onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchTrending();
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const timeout = setTimeout(() => searchGifs(searchQuery), 400);
      return () => clearTimeout(timeout);
    } else if (searchQuery.trim().length === 0) {
      fetchTrending();
    }
  }, [searchQuery]);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${TENOR_BASE}/featured?key=${TENOR_API_KEY}&limit=30&media_filter=tinygif,gif`
      );
      const data = await res.json();
      setGifs(data.results || []);
    } catch (err) {
      console.error('Tenor trending error:', err);
    }
    setLoading(false);
  };

  const searchGifs = async (query) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${TENOR_BASE}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=30&media_filter=tinygif,gif`
      );
      const data = await res.json();
      setGifs(data.results || []);
    } catch (err) {
      console.error('Tenor search error:', err);
    }
    setLoading(false);
  };

  const getGifUrl = (item) => {
    return item.media_formats?.gif?.url || item.media_formats?.tinygif?.url || '';
  };

  const getThumbnailUrl = (item) => {
    return item.media_formats?.tinygif?.url || item.media_formats?.gif?.url || '';
  };

  const renderGif = ({ item }) => (
    <TouchableOpacity
      style={styles.gifItem}
      onPress={() => onSelect(getGifUrl(item))}
      activeOpacity={0.8}
    >
      <Image source={{ uri: getThumbnailUrl(item) }} style={styles.gifImage} />
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>GIFs</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#5D5E60" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Search size={16} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search GIFs..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={false}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={gifs}
              renderItem={renderGif}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          <Text style={styles.attribution}>Powered by Tenor</Text>
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
    height: '65%',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#1B1B1B',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  gridContent: {
    paddingBottom: 20,
  },
  gifItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  attribution: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#C7C7CC',
    textAlign: 'center',
    paddingBottom: 20,
  },
});
