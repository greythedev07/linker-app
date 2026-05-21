import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  useWindowDimensions,
  Keyboard,
  Platform,
  Modal,
  Clipboard,
  Image,
  Alert,
  LayoutAnimation,
  UIManager,
  Linking,
  ActivityIndicator,
  PanResponder,
  Share as RNShare,
} from 'react-native';
import { Video as VideoPlayer, Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { BlurView } from 'expo-blur';

const DEFAULT_AVATAR = require('../../assets/default-avatar.png');
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { CipherService } from '../crypto/cipher';
import { MediaEngine } from '../media/engine';
import { useAudioRecorder, RecordingPresets, useAudioPlayer, AudioModule } from 'expo-audio';
import { EmojiPickerSheet } from '../components/EmojiPickerSheet';
import { Send, Plus, Settings, Video, Mic, Square, Play, FileText, X, RefreshCw, LayoutGrid, ArrowLeft, Info, Download, Share, ChevronUp, Check } from 'lucide-react-native';
import { SettingsScreen } from './SettingsScreen';
import { AttachmentMenu } from '../components/AttachmentMenu';
import { GifPicker } from '../components/GifPicker';
import { StickerPicker } from '../components/StickerPicker';
import { EmojiText, getAppleEmojiUrl } from '../components/EmojiText';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import { ExtendedAudioPlayer } from '../components/ExtendedAudioPlayer';

// ── Audio Playback Sub-Component ──
const AudioBubble = ({ audioUrl, msgId, isMe, onLongPress }) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);

  const onPlaybackStatusUpdate = (status) => {
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
    } else if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 1);
    }
  };

  useEffect(() => {
    async function loadSound() {
      if (audioUrl) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioUrl },
            { shouldPlay: false },
            onPlaybackStatusUpdate
          );
          setSound(sound);
        } catch (e) {
          console.error('Error loading sound:', e);
        }
      }
    }
    loadSound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [audioUrl]);

  const toggle = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  const handleLongPress = async () => {
    if (sound && isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
    if (onLongPress) onLongPress();
  };

  return (
    <TouchableOpacity style={styles.audioRow} onPress={toggle} onLongPress={handleLongPress}>
      <View style={[styles.audioPlayBtn, isPlaying && styles.audioPlayBtnActive]}>
        {isPlaying
          ? <Square size={12} color="#FFFFFF" fill="#FFFFFF" />
          : <Play size={14} color="#FFFFFF" fill="#FFFFFF" />}
      </View>
      <View style={styles.audioWaveform}>
        {[...Array(15)].map((_, i) => {
          const progress = position / duration;
          const isPlayed = (i / 15) < progress;
          return (
            <View
              key={i}
              style={[
                styles.audioBar,
                { height: 6 + Math.sin(i * 0.6) * 12 },
                isMe
                  ? { backgroundColor: isPlayed ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }
                  : { backgroundColor: isPlayed ? '#007AFF' : '#C7C7CC' },
              ]}
            />
          );
        })}
      </View>
      <Text style={[styles.audioDuration, isMe ? styles.textMe : { color: '#8E8E93' }]}>
        {formatDuration(duration - position)}
      </Text>
    </TouchableOpacity>
  );
};

const formatDuration = (millis) => {
  const totalSeconds = Math.ceil(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const getSmartTimestamp = (dateString, now = new Date()) => {
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return 'a minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return 'an hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatTimeline = ({ user, onSignOut, onUserUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [downloadStatus, setDownloadStatus] = useState(null); // null, 'loading', 'success', 'error'
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [inputText, setInputText] = useState('');
  const [partner, setPartner] = useState(null);
  const [nodeKey, setNodeKey] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState('0:00');
  const [reactingToMessage, setReactingToMessage] = useState(null);
  const [pressedMessageLayout, setPressedMessageLayout] = useState(null);
  const messageRefs = useRef({});
  const [attachments, setAttachments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const timerRef = useRef(null);
  const [longPressedMessage, setLongPressedMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const flatListRef = useRef();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputHeight, setInputHeight] = useState(44);
  const [currentTime, setCurrentTime] = useState(new Date());
  const currentImageIndexRef = useRef(0);
  const largeListRef = useRef();
  const carouselRef = useRef();
  const lastIndexRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    currentImageIndexRef.current = 0;
  }, [longPressedMessage]);

  useEffect(() => {
    if (selectedMedia) {
      lastIndexRef.current = -1;
    }
  }, [selectedMedia]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dy) > 50) {
          setSelectedMedia(null);
        }
      },
    })
  ).current;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    initializeChat();

    const channel = supabase
      .channel('room:1')
      .on('postgres_changes', { event: 'INSERT', table: 'messages' }, payload => {
        handleInboundMessage(payload.new);
      })
      .subscribe();

    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      supabase.removeChannel(channel);
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Init ──
  const initializeChat = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('linked_partner_id')
      .eq('id', user.id)
      .single();

    let key = null;

    if (profile?.linked_partner_id) {
      const { data: partnerData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.linked_partner_id)
        .single();
      setPartner(partnerData);

      key = await CipherService.deriveSharedKey(user.id, profile.linked_partner_id);
      setNodeKey(key);
    }

    const { data: initialMessages } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    console.log('[ChatTimeline] Initial messages types:', initialMessages?.map(m => m.type));

    const decryptedMessages = await Promise.all(
      (initialMessages || []).map(async msg => {
        let content = msg.content;
        if (msg.is_encrypted && key) {
          try { content = await CipherService.decrypt(msg.content, key); }
          catch (e) { content = msg.content; }

          if (msg.type === 'IMAGE' && content.trim().startsWith('{')) {
            try {
              const data = JSON.parse(content);
              if (data.subType === 'GIF') {
                msg.type = 'GIF';
                content = data.url;
              } else if (data.subType === 'STICKER') {
                msg.type = 'STICKER';
                content = data.url;
              }
            } catch (e) { }
          }

          if (msg.type === 'IMAGE' && content.trim().startsWith('[')) {
            let items = [];
            try { items = JSON.parse(content); } catch { items = []; }
            const decItems = await Promise.all(items.map(async item => {
              try {
                const decUrl = await CipherService.decrypt(item.url, key);
                return { ...item, url: decUrl };
              } catch {
                return item;
              }
            }));
            content = JSON.stringify(decItems);
          }
        }
        return { ...msg, content };
      })
    );
    setMessages(decryptedMessages);
  };

  const handleInboundMessage = async (newMsg) => {
    const key = await CipherService.getSharedKey();
    let content = newMsg.content;
    console.log('[ChatTimeline] Inbound message type:', newMsg.type);
    if (newMsg.is_encrypted && key) {
      try { content = await CipherService.decrypt(newMsg.content, key); }
      catch (e) { content = newMsg.content; }

      if (newMsg.type === 'IMAGE' && content.trim().startsWith('{')) {
        try {
          const data = JSON.parse(content);
          if (data.subType === 'GIF') {
            newMsg.type = 'GIF';
            content = data.url;
          } else if (data.subType === 'STICKER') {
            newMsg.type = 'STICKER';
            content = data.url;
          }
        } catch (e) { }
      }

      if (newMsg.type === 'IMAGE' && content.trim().startsWith('[')) {
        let items = [];
        try { items = JSON.parse(content); } catch { items = []; }
        const decItems = await Promise.all(items.map(async item => {
          try {
            const decUrl = await CipherService.decrypt(item.url, key);
            return { ...item, url: decUrl };
          } catch {
            return item;
          }
        }));
        content = JSON.stringify(decItems);
      }
    }

    setMessages(prev => {
      // 1. Check if real message already exists by ID
      const existsById = prev.some(m => m.id === newMsg.id);
      if (existsById) {
        return prev.map(m => m.id === newMsg.id ? { ...newMsg, content } : m);
      }

      // 2. Check if this is a real message replacing a temp message
      const tempMessage = prev.find(m => m.id?.toString().startsWith('temp-') && m.content === content);
      if (tempMessage) {
        return prev.map(m => m.id === tempMessage.id ? { ...newMsg, content } : m);
      }

      // 3. Otherwise, add it to the bottom (index 0)
      return [{ ...newMsg, content }, ...prev];
    });

    if (newMsg.sender_id === user.id) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  };

  const getKey = async () => nodeKey || await CipherService.getSharedKey();

  // ── Send Message & Attachments ──
  const sendMessage = async () => {
    if (!inputText.trim() && attachments.length === 0) return;

    setIsSending(true);

    try {
      const text = inputText.trim();
      setInputText('');
      const currentAttachments = [...attachments];
      setAttachments([]);

      const key = await getKey();

      if (text) {
        const encryptedContent = await CipherService.encrypt(text, key);

        if (editingMessage) {
          // Update local state
          setMessages(prev => prev.map(m =>
            m.id === editingMessage.id ? { ...m, content: text, is_edited: true } : m
          ));

          // Update DB
          await supabase
            .from('messages')
            .update({ content: encryptedContent, is_edited: true })
            .eq('id', editingMessage.id);

          setEditingMessage(null);
        } else {
          // Insert new text message
          await supabase.from('messages').insert({
            sender_id: user.id,
            content: encryptedContent,
            is_encrypted: true,
            type: 'TEXT',
            reply_to_id: replyingTo?.id,
          });
        }
      }

      // Send attachments
      const mediaGroup = currentAttachments.filter(a => a.msgType === 'IMAGE' || a.msgType === 'VIDEO');
      const otherFiles = currentAttachments.filter(a => a.msgType === 'FILE');
      const audioFiles = currentAttachments.filter(a => a.msgType === 'AUDIO');

      // Handle audio files
      for (const asset of audioFiles) {
        const payload = await MediaEngine.uploadAndEncrypt(asset.uri, asset.mimeType, key, 'AUDIO');
        await supabase.from('messages').insert({
          sender_id: user.id,
          content: payload.url,
          is_encrypted: true,
          type: 'AUDIO',
          reply_to_id: replyingTo?.id,
        });
      }

      // Handle other files
      for (const asset of otherFiles) {
        const payload = await MediaEngine.uploadAndEncrypt(asset.uri, asset.mimeType, key, 'FILE');
        const content = JSON.stringify({
          url: payload.url,
          name: asset.name,
          size: asset.size,
        });
        const encryptedContent = await CipherService.encrypt(content, key);
        await supabase.from('messages').insert({
          sender_id: user.id,
          content: encryptedContent,
          is_encrypted: true,
          type: 'FILE',
          reply_to_id: replyingTo?.id,
        });
      }

      // Handle media group (multiple images/videos)
      console.log('[ChatTimeline] mediaGroup length:', mediaGroup.length);
      if (mediaGroup.length > 1) {
        console.log('[ChatTimeline] Sending as MEDIA_GROUP');
        const urls = [];
        for (const asset of mediaGroup) {
          const payload = await MediaEngine.uploadAndEncrypt(asset.uri, asset.mimeType, key, asset.msgType);
          urls.push({ url: payload.url, type: asset.msgType });
        }
        const encryptedContent = await CipherService.encrypt(JSON.stringify(urls), key);
        console.log('[ChatTimeline] Encrypted content length:', encryptedContent.length);
        const { error } = await supabase.from('messages').insert({
          sender_id: user.id,
          content: encryptedContent,
          is_encrypted: true,
          type: 'IMAGE',
          reply_to_id: replyingTo?.id,
        });
        if (error) console.error('[ChatTimeline] Insert error:', error);
        else console.log('[ChatTimeline] Inserted stacked images message');
      } else if (mediaGroup.length === 1) {
        const asset = mediaGroup[0];
        const payload = await MediaEngine.uploadAndEncrypt(asset.uri, asset.mimeType, key, asset.msgType);
        await supabase.from('messages').insert({
          sender_id: user.id,
          content: payload.url,
          is_encrypted: true,
          type: asset.msgType,
          reply_to_id: replyingTo?.id,
        });
      }

      setReplyingTo(null);
    } catch (err) {
      console.error('Send error:', err);
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;

      let reactions = msg.reactions || {};
      if (typeof reactions === 'string') {
        try { reactions = JSON.parse(reactions); } catch { reactions = {}; }
      }

      // Remove user ID from all other emojis
      Object.keys(reactions).forEach(e => {
        if (e !== emoji) {
          reactions[e] = reactions[e].filter(id => id !== user.id);
          if (reactions[e].length === 0) {
            delete reactions[e];
          }
        }
      });

      const users = reactions[emoji] || [];
      const userIndex = users.indexOf(user.id);

      if (userIndex > -1) {
        users.splice(userIndex, 1);
      } else {
        users.push(user.id);
      }

      if (users.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = users;
      }

      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions } : m
      ));

      await supabase
        .from('messages')
        .update({ reactions })
        .eq('id', messageId);

    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setInputText(message.content);
  };

  const handleDelete = async (messageId) => {
    try {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, is_deleted: true, content: 'This message was deleted' } : m
      ));

      const key = await getKey();
      const encryptedContent = await CipherService.encrypt('This message was deleted', key);

      await supabase
        .from('messages')
        .update({ is_deleted: true, content: encryptedContent })
        .eq('id', messageId);

    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const handleSaveMedia = async (message) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to save to your device.');
        return;
      }

      setLongPressedMessage(null);
      setPressedMessageLayout(null);
      setDownloadStatus('loading');

      let urlToSave = message.content;
      let ext = 'jpg';

      if (message.type === 'IMAGE' && message.content.trim().startsWith('[')) {
        let mediaItems = [];
        try { mediaItems = JSON.parse(message.content); } catch (e) { mediaItems = []; }
        const selectedImage = mediaItems[currentImageIndexRef.current];
        if (selectedImage) {
          urlToSave = typeof selectedImage === 'string' ? selectedImage : selectedImage.url;
          if ((typeof selectedImage === 'string' ? 'IMAGE' : selectedImage.type) === 'VIDEO') ext = 'mp4';
        }
      } else if (message.type === 'VIDEO') {
        ext = 'mp4';
      } else if (message.type === 'AUDIO') {
        ext = 'm4a';
      } else if (message.type === 'GIF') {
        ext = 'gif';
      }

      const fileUri = `${FileSystem.cacheDirectory}downloaded_media_${Date.now()}.${ext}`;

      const { uri } = await FileSystem.downloadAsync(urlToSave, fileUri);
      await MediaLibrary.createAssetAsync(uri);

      setDownloadStatus('success');
      setTimeout(() => setDownloadStatus(null), 2000);
    } catch (error) {
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus(null), 2000);
      console.error(error);
    }
  };

  // ── Attachment Menu Handler ──
  const handleAttachmentSelect = async (type) => {
    switch (type) {
      case 'gallery': return handlePickGallery();
      case 'audio': return handlePickAudio();
      case 'files': return handlePickDocument();
      case 'emojis': return setShowEmojiPicker(true);
      case 'stickers': return setShowStickerPicker(true);
      case 'gifs': return setShowGifPicker(true);
    }
  };

  // ── Gallery ──
  const handlePickGallery = async () => {
    try {
      const assets = await MediaEngine.pickMedia();
      if (!assets || assets.length === 0) return;

      const newAttachments = assets.map(asset => ({
        ...asset,
        mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
        msgType: asset.type === 'video' ? 'VIDEO' : 'IMAGE'
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (err) {
      console.error('Gallery error:', err);
    }
  };

  // ── Audio File ──
  const handlePickAudio = async () => {
    try {
      const assets = await MediaEngine.pickAudioFile();
      if (!assets || assets.length === 0) return;

      const newAttachments = assets.map(asset => ({
        ...asset,
        mimeType: asset.mimeType || 'audio/mpeg',
        msgType: 'AUDIO'
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (err) {
      console.error('Audio file error:', err);
    }
  };

  // ── Document (PDF, DOCX, PPTX) ──
  const handlePickDocument = async () => {
    try {
      const assets = await MediaEngine.pickDocument();
      if (!assets || assets.length === 0) return;

      const newAttachments = assets.map(asset => ({
        ...asset,
        mimeType: asset.mimeType || 'application/octet-stream',
        msgType: 'FILE'
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (err) {
      console.error('Document error:', err);
    }
  };

  // ── Emoji ──
  const handleEmojiSelected = (emoji) => {
    if (reactingToMessage) {
      handleReact(reactingToMessage.id, emoji);
      setReactingToMessage(null);
      setShowEmojiPicker(false);
    } else {
      setInputText(prev => prev + emoji);
    }
  };

  // ── GIF ──
  const handleGifSelect = async (gifUrl) => {
    setShowGifPicker(false);
    try {
      const key = await getKey();
      const payload = JSON.stringify({ url: gifUrl, subType: 'GIF' });
      const encryptedUrl = await CipherService.encrypt(payload, key);

      const newMessage = {
        id: 'temp-' + Date.now(),
        sender_id: user.id,
        content: gifUrl,
        is_encrypted: true,
        type: 'GIF',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [newMessage, ...prev]);

      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);

      await supabase.from('messages').insert({
        sender_id: user.id,
        content: encryptedUrl,
        is_encrypted: true,
        type: 'IMAGE',
      });
    } catch (err) {
      console.error('GIF error:', err);
    }
  };

  // ── Sticker ──
  const handleStickerSelect = async (stickerUrl) => {
    setShowStickerPicker(false);
    try {
      const key = await getKey();
      const payload = JSON.stringify({ url: stickerUrl, subType: 'STICKER' });
      const encryptedUrl = await CipherService.encrypt(payload, key);

      const newMessage = {
        id: 'temp-' + Date.now(),
        sender_id: user.id,
        content: stickerUrl,
        is_encrypted: true,
        type: 'STICKER',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [newMessage, ...prev]);

      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);

      await supabase.from('messages').insert({
        sender_id: user.id,
        content: encryptedUrl,
        is_encrypted: true,
        type: 'IMAGE',
      });
    } catch (err) {
      console.error('Sticker error:', err);
    }
  };

  // ── Voice Recording (expo-audio) ──
  const startRecording = async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Denied', 'Microphone permission is required to record audio.');
        return;
      }

      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
      setIsRecording(true);

      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setRecordingDuration(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }, 1000);
    } catch (err) {
      console.error('Recording start error:', err);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const stopAndSendRecording = async () => {
    try {
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingDuration('0:00');

      await audioRecorder.stop();

      const uri = audioRecorder.uri;
      if (!uri) return;

      const key = await getKey();
      const payload = await MediaEngine.uploadAndEncrypt(uri, 'audio/m4a', key, 'AUDIO');

      const decUrl = await CipherService.decrypt(payload.url, key);
      const newMessage = {
        id: 'temp-' + Date.now(),
        sender_id: user.id,
        content: decUrl,
        is_encrypted: true,
        type: 'AUDIO',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [newMessage, ...prev]);

      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);

      await supabase.from('messages').insert({
        sender_id: user.id,
        content: payload.url,
        is_encrypted: true,
        type: 'AUDIO',
      });
    } catch (err) {
      console.error('Recording send error:', err);
      Alert.alert('Error', 'Could not send voice message.');
    }
  };

  const cancelRecording = async () => {
    try {
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingDuration('0:00');
      await audioRecorder.stop();
    } catch (err) {
      console.error('Cancel recording error:', err);
    }
  };

  // ── Helpers ──
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getFileIcon = (name) => {
    if (name?.endsWith('.pdf')) return '📄';
    if (name?.endsWith('.docx')) return '📝';
    if (name?.endsWith('.pptx')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // ── Message Rendering ──
  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === user.id;
    const prevMsg = messages[index - 1];
    let showTimestamp = !prevMsg;
    if (prevMsg) {
      const timeDiffMins = (new Date(item.created_at) - new Date(prevMsg.created_at)) / 60000;
      const dayChanged = new Date(item.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
      showTimestamp = timeDiffMins > 15 || dayChanged;
    }

    let content = null;

    if (item.is_deleted) {
      content = (
        <Text style={[styles.messageText, isMe ? styles.textMe : styles.textPartner, { fontStyle: 'italic', color: '#8E8E93' }]}>
          🚫 This message was deleted
        </Text>
      );
    } else {
      switch (item.type) {
        case 'IMAGE':
          if (item.content.trim().startsWith('[')) {
            let mediaItems = [];
            try {
              mediaItems = JSON.parse(item.content);
            } catch (e) {
              console.log('IMAGE group parse error:', e, 'content:', item.content);
              mediaItems = [];
            }
            content = (
              <View style={styles.stackContainer}>
                <View style={styles.groupHeader}>
                  <LayoutGrid size={16} color="#007AFF" />
                  <Text style={styles.groupHeaderText}>{mediaItems.length} photos</Text>
                </View>
                <View style={styles.stack}>
                  {mediaItems.slice(0, 3).reverse().map((media, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: typeof media === 'string' ? media : media.url }}
                      style={[
                        styles.stackImage,
                        idx === 1 && styles.stackMiddle,
                        idx === 0 && styles.stackBack,
                      ]}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              </View>
            );
          } else {
            content = (
              <View>
                <Image source={{ uri: item.content }} style={styles.mediaImage} resizeMode="cover" />
              </View>
            );
          }
          break;

        case 'VIDEO':
          content = (
            <View style={styles.mediaThumbnail}>
              <View style={styles.playOverlay}>
                <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <Text style={[styles.messageText, isMe ? styles.textMe : styles.textPartner]}>
                🎬 Video
              </Text>
            </View>
          );
          break;

        case 'AUDIO':
          content = (
            <AudioBubble
              audioUrl={item.content}
              msgId={item.id}
              isMe={isMe}
              onLongPress={() => {
                if (item.is_deleted) return;
                messageRefs.current[item.id].measure((x, y, width, height, pageX, pageY) => {
                  setPressedMessageLayout({ x: pageX, y: pageY, width, height });
                  setLongPressedMessage(item);
                });
              }}
            />
          );
          break;

        case 'FILE':
          let fileData = {};
          try { fileData = JSON.parse(item.content); }
          catch { fileData = { name: 'Document', url: item.content }; }
          content = (
            <View style={styles.fileCard}>
              <Text style={styles.fileIcon}>{getFileIcon(fileData.name)}</Text>
              <View style={styles.fileInfo}>
                <Text
                  style={[styles.fileName, isMe ? styles.textMe : styles.textPartner]}
                  numberOfLines={1}
                >
                  {fileData.name || 'Document'}
                </Text>
                <Text style={[styles.fileSize, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: '#8E8E93' }]}>
                  {formatFileSize(fileData.size)}
                </Text>
              </View>
              <FileText size={18} color={isMe ? 'rgba(255,255,255,0.7)' : '#007AFF'} />
            </View>
          );
          break;

        case 'GIF':
          content = (
            <Image source={{ uri: item.content }} style={styles.gifMessage} resizeMode="cover" />
          );
          break;

        case 'STICKER':
          content = (
            <Image source={{ uri: item.content }} style={styles.stickerMessage} resizeMode="contain" />
          );
          break;

        default:
          content = (
            <EmojiText style={[styles.messageText, isMe ? styles.textMe : styles.textPartner]}>
              {item.content}
            </EmojiText>
          );
      }
    }

    const noBubble = item.type === 'STICKER' || item.type === 'GIF' || item.type === 'IMAGE' || item.type === 'VIDEO' || item.type === 'MEDIA_GROUP';

    return (
      <View style={[styles.messageRow, isMe ? styles.rowMe : styles.rowPartner]}>

        <View style={[styles.bubbleColumn, !isMe && { alignItems: 'flex-start' }]}>
          <TouchableOpacity
            ref={r => messageRefs.current[item.id] = r}
            onLongPress={() => {
              if (item.is_deleted) return;
              messageRefs.current[item.id].measure((x, y, width, height, pageX, pageY) => {
                setPressedMessageLayout({ x: pageX, y: pageY, width, height });
                setLongPressedMessage(item);
              });
            }}
            activeOpacity={item.is_deleted ? 1 : 0.9}
            onPress={() => {
              if (item.is_deleted) return;
              if (['IMAGE', 'VIDEO', 'GIF', 'STICKER'].includes(item.type)) {
                if (item.type === 'IMAGE' && item.content.trim().startsWith('[')) {
                  let mediaItems = [];
                  try { mediaItems = JSON.parse(item.content); } catch { mediaItems = []; }
                  if (mediaItems.length > 0) {
                    const firstMedia = mediaItems[0];
                    setSelectedMedia({ ...item, content: firstMedia.url, type: firstMedia.type });
                  }
                } else {
                  setSelectedMedia(item);
                }
              } else if (item.type === 'FILE') {
                let fileData = {};
                try { fileData = JSON.parse(item.content); }
                catch { fileData = { url: item.content }; }
                if (fileData.url) Linking.openURL(fileData.url);
              }
            }}
          >
            <View style={[
              noBubble ? styles.noBubble : styles.bubble,
              !noBubble && (isMe ? styles.bubbleMe : styles.bubblePartner),
              item.is_deleted && { opacity: 0.5 },
              item.id === longPressedMessage?.id && { opacity: 0 },
            ]}>
              {item.reply_to_id && !item.is_deleted && (
                <TouchableOpacity
                  onPress={() => {
                    const index = messages.findIndex(m => m.id === item.reply_to_id);
                    if (index >= 0) {
                      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                    }
                  }}
                  style={[styles.replySnippet, isMe ? styles.replySnippetMe : styles.replySnippetPartner]}
                >
                  {(() => {
                    const repliedMsg = messages.find(m => m.id === item.reply_to_id);
                    if (repliedMsg) {
                      return (
                        <>
                          <Text style={styles.replySnippetTitle}>
                            {repliedMsg.sender_id === user.id ? 'You' : partnerName}
                          </Text>
                          <Text style={styles.replySnippetText} numberOfLines={1}>
                            {repliedMsg.type === 'IMAGE' ? '📷 Photo' :
                              repliedMsg.type === 'VIDEO' ? '🎥 Video' :
                                repliedMsg.type === 'AUDIO' ? '🎵 Audio' :
                                  repliedMsg.type === 'FILE' ? '📁 File' :
                                    repliedMsg.content}
                          </Text>
                        </>
                      );
                    }
                    return <Text style={styles.replySnippetText}>Original message unavailable</Text>;
                  })()}
                </TouchableOpacity>
              )}
              {content}
              {(item.is_edited || item.is_deleted) && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
                  <Text style={[styles.indicatorText, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: '#8E8E93' }]}>
                    {item.is_deleted ? 'Deleted' : 'Edited'}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          {item.reactions && Object.keys(item.reactions).length > 0 && (
            <View style={[styles.reactionChips, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
              {Object.entries(item.reactions).map(([emoji, users]) => (
                <View key={emoji} style={styles.reactionChip}>
                  <Image source={{ uri: getAppleEmojiUrl(emoji) }} style={{ width: 20, height: 20 }} resizeMode="contain" />
                </View>
              ))}
            </View>
          )}
          {showTimestamp && (
            <Text style={styles.timestamp}>{getSmartTimestamp(item.created_at, currentTime)}</Text>
          )}
        </View>
      </View >
    );
  };

  const partnerName = partner?.display_name || 'Partner';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#A8E6CF', '#7FCDCD', '#A8D8EA']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowSettings(true)}>
            <Settings size={20} color="#1B1B1B" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.partnerAvatarLargeWrap}>
              <Image
                source={partner?.avatar_url ? { uri: partner.avatar_url } : DEFAULT_AVATAR}
                style={styles.partnerAvatarLarge}
              />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.partnerNameRow}>
              <Text style={styles.partnerName}>{partnerName}</Text>
              <Text style={styles.chevron}> ›</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.headerIconBtn}>
            <Video size={20} color="#1B1B1B" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id?.toString()}
          inverted={true}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.top + 80 }]}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            }, 100);
          }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={() => (
            <View style={{ height: insets.bottom + 80 + keyboardHeight }} />
          )}
        />

        {/* Floating Input Bar */}
        <View style={{
          position: 'absolute', bottom: keyboardHeight, left: 0, right: 0,
          zIndex: 1,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        }}>
          {replyingTo && (
            <View style={styles.replyPreviewBar}>
              <View style={styles.replyPreviewContent}>
                <Text style={styles.replyPreviewTitle}>Replying to {replyingTo.sender_id === user.id ? 'yourself' : partnerName}</Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {replyingTo.type === 'IMAGE' ? '📷 Photo' :
                    replyingTo.type === 'VIDEO' ? '🎥 Video' :
                      replyingTo.type === 'AUDIO' ? '🎵 Audio' :
                        replyingTo.type === 'FILE' ? '📁 File' :
                          replyingTo.content}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <X size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          )}
          {attachments.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentsPreviewContainer}>
              {attachments.map((asset, index) => (
                <View key={index} style={styles.attachmentPreviewItem}>
                  {(asset.msgType === 'IMAGE' || asset.msgType === 'VIDEO') ? (
                    <Image source={{ uri: asset.uri }} style={styles.attachmentPreviewImage} />
                  ) : (
                    <View style={styles.attachmentPreviewIcon}>
                      <FileText size={24} color="#8E8E93" />
                    </View>
                  )}
                  {asset.msgType === 'VIDEO' && (
                    <View style={styles.attachmentPreviewVideoIcon}>
                      <Video size={12} color="#FFF" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.attachmentRemoveBtn}
                    onPress={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                  >
                    <X size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity style={styles.plusButton} onPress={() => { Keyboard.dismiss(); setShowAttachMenu(true); }}>
              <Plus size={22} color="#007AFF" />
            </TouchableOpacity>

            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.textInput, { height: Math.min(100, Math.max(44, inputHeight)) }]}
                placeholder="Type a message..."
                placeholderTextColor="#A0A0A0"
                value={inputText}
                onChangeText={setInputText}
                multiline
                underlineColorAndroid="transparent"
                onContentSizeChange={(event) => {
                  setInputHeight(event.nativeEvent.contentSize.height);
                }}
              />
              {(!inputText.trim() && attachments.length === 0 && !isRecording) && (
                <TouchableOpacity style={styles.micButton} onPress={startRecording}>
                  <Mic size={18} color="#007AFF" />
                </TouchableOpacity>
              )}
              {isRecording && (
                <TouchableOpacity style={styles.micButton} onPress={stopAndSendRecording}>
                  <Square size={16} color="#FF3B30" fill="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>

            {(inputText.trim() || attachments.length > 0) ? (
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={isSending}>
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {/* ── Modals ── */}
      {/* Audio Recording Modal */}
      <Modal
        visible={isRecording}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelRecording}
      >
        <View style={styles.recordingModalBackground}>
          <View style={styles.recordingCard}>
            <View style={styles.recordingMicWrapper}>
              <View style={styles.recordingMicCircle}>
                <Mic size={32} color="#007AFF" />
              </View>
            </View>

            <Text style={styles.recordingTimer}>{recordingDuration}</Text>

            <View style={styles.recordingWaveform}>
              {[...Array(30)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.recordingBar,
                    { height: 10 + Math.sin(i * 0.5) * 20 }
                  ]}
                />
              ))}
            </View>

            <View style={styles.recordingActions}>
              <TouchableOpacity style={styles.recordingActionBtn} onPress={cancelRecording}>
                <RefreshCw size={24} color="#8E8E93" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.recordingSendBtn} onPress={stopAndSendRecording}>
                <Send size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AttachmentMenu
        visible={showAttachMenu}
        onClose={() => setShowAttachMenu(false)}
        onSelect={handleAttachmentSelect}
      />

      <GifPicker
        visible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelect={handleGifSelect}
      />

      <StickerPicker
        visible={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelect={handleStickerSelect}
      />

      <EmojiPickerSheet
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={handleEmojiSelected}
      />

      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <SettingsScreen
          user={user}
          onClose={() => setShowSettings(false)}
          onSignOut={onSignOut}
          onNicknameUpdate={(newName) => {
            if (onUserUpdate) onUserUpdate({ ...user, display_name: newName });
          }}
        />
      </Modal>

      {/* Media Viewer Modal */}
      <Modal
        visible={!!selectedMedia}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedMedia(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} {...panResponder.panHandlers}>
          {(() => {
            const allMedia = messages.flatMap(m => {
              if (m.type === 'IMAGE' && m.content.trim().startsWith('[')) {
                let items = [];
                try { items = JSON.parse(m.content); } catch { items = []; }
                return items.map((img, idx) => ({ ...m, id: `${m.id}-${idx}`, content: img.url, type: img.type }));
              }
              if (m.type === 'IMAGE' || m.type === 'VIDEO' || m.type === 'GIF' || m.type === 'STICKER') {
                return [m];
              }
              return [];
            }).filter(m => m.content);

            return (
              <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
                  <TouchableOpacity onPress={() => setSelectedMedia(null)}>
                    <ArrowLeft size={24} color="#000000" />
                  </TouchableOpacity>
                  <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: '#000000' }}>
                    {selectedMedia ? new Date(selectedMedia.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                  </Text>
                  <View style={{ width: 24 }} />
                </View>

                {/* Large Media List */}
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <FlatList
                    ref={largeListRef}
                    data={allMedia}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={allMedia.findIndex(m => m.id === selectedMedia?.id) >= 0 ? allMedia.findIndex(m => m.id === selectedMedia?.id) : 0}
                    getItemLayout={(data, index) => (
                      { length: screenWidth, offset: index * screenWidth, index }
                    )}
                    onScroll={(e) => {
                      const offset = e.nativeEvent.contentOffset.x;
                      const index = Math.round(offset / screenWidth);
                      if (index !== lastIndexRef.current) {
                        lastIndexRef.current = index;
                        carouselRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                        if (allMedia[index]) setSelectedMedia(allMedia[index]);
                      }
                    }}
                    scrollEventThrottle={16}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <View
                        style={{ width: screenWidth, height: screenHeight * 0.65, justifyContent: 'center', alignItems: 'center' }}
                      >
                        {(item.type === 'IMAGE' || item.type === 'GIF' || item.type === 'STICKER') && (
                          <Image source={{ uri: item.content }} style={{ width: screenWidth * 0.9, height: screenHeight * 0.65 }} resizeMode="contain" />
                        )}
                        {item.type === 'VIDEO' && (
                          <CustomVideoPlayer
                            source={{ uri: item.content }}
                            style={{ width: screenWidth * 0.9, height: screenHeight * 0.65 }}
                            isActive={selectedMedia?.id === item.id}
                          />
                        )}
                      </View>
                    )}
                  />
                </View>


                {/* Carousel (Thumbnails) */}
                <View style={{ height: 80, justifyContent: 'center', paddingVertical: 10 }}>
                  <FlatList
                    ref={carouselRef}
                    data={allMedia}
                    horizontal
                    keyExtractor={item => item.id.toString()}
                    getItemLayout={(data, index) => (
                      { length: 70, offset: 10 + index * 70, index }
                    )}
                    renderItem={({ item }) => {
                      const isActive = selectedMedia?.id === item.id || selectedMedia?.content === item.content;
                      return (
                        <TouchableOpacity
                          onPress={() => {
                            const index = allMedia.findIndex(m => m.id === item.id);
                            if (index >= 0) {
                              largeListRef.current?.scrollToIndex({ index, animated: true });
                              setSelectedMedia(item);
                            }
                          }}
                          style={{ marginHorizontal: 5 }}
                        >
                          <View style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', borderWidth: isActive ? 2 : 0, borderColor: '#007AFF' }}>
                            <Image source={{ uri: item.content }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            {item.type === 'VIDEO' && (
                              <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    contentContainerStyle={{ paddingHorizontal: 10 }}
                    showsHorizontalScrollIndicator={false}
                  />
                </View>

                {/* Bottom Menu */}
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    width: '80%',
                    backgroundColor: '#F2F2F7',
                    borderRadius: 24,
                    paddingVertical: 12
                  }}>
                    <TouchableOpacity onPress={() => {
                      Alert.alert(
                        'Media Info',
                        `Sent at: ${getSmartTimestamp(selectedMedia.created_at, currentTime)}\nType: ${selectedMedia.type}`
                      );
                    }}>
                      <Info size={20} color="#000000" />
                    </TouchableOpacity>
                    <View style={{ width: 1, height: 20, backgroundColor: '#E5E5EA' }} />
                    <TouchableOpacity onPress={async () => {
                      if (selectedMedia.content) {
                        try {
                          const { status } = await MediaLibrary.requestPermissionsAsync(true);
                          if (status !== 'granted') {
                            Alert.alert('Permission Denied', 'We need permission to save to your gallery.');
                            return;
                          }

                          setDownloadStatus('loading');

                          const ext = selectedMedia.type === 'VIDEO' ? 'mp4' : 'jpg';
                          const fileUri = `${FileSystem.cacheDirectory}downloaded_media_${Date.now()}.${ext}`;

                          const { uri } = await FileSystem.downloadAsync(
                            selectedMedia.content,
                            fileUri
                          );

                          await MediaLibrary.createAssetAsync(uri);
                          setDownloadStatus('success');
                          setTimeout(() => setDownloadStatus(null), 2000);
                        } catch (error) {
                          setDownloadStatus('error');
                          setTimeout(() => setDownloadStatus(null), 2000);
                          console.error(error);
                        }
                      }
                    }}>
                      <Download size={20} color="#000000" />
                    </TouchableOpacity>
                    <View style={{ width: 1, height: 20, backgroundColor: '#E5E5EA' }} />
                    <TouchableOpacity onPress={async () => {
                      try {
                        setDownloadStatus('sharing');

                        const ext = selectedMedia.type === 'VIDEO' ? 'mp4' : 'jpg';
                        const fileUri = `${FileSystem.cacheDirectory}share_media_${Date.now()}.${ext}`;

                        const { uri } = await FileSystem.downloadAsync(
                          selectedMedia.content,
                          fileUri
                        );

                        setDownloadStatus(null);

                        const mimeType = selectedMedia.type === 'VIDEO' ? 'video/mp4' : 'image/jpeg';
                        await Sharing.shareAsync(uri, { mimeType });
                      } catch (error) {
                        setDownloadStatus(null);
                        Alert.alert('Error', error.message);
                      }
                    }}>
                      <Share size={20} color="#000000" />
                    </TouchableOpacity>
                  </View>
                </View>
              </SafeAreaView>
            );
          })()}
          {/* HUD */}
          {downloadStatus && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }]}>
              <BlurView intensity={100} tint="light" style={{ width: 140, height: 140, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.75)' }}>
                {downloadStatus === 'loading' && (
                  <>
                    <ActivityIndicator size="large" color="#000000" />
                    <Text style={{ marginTop: 10, fontFamily: 'Inter', fontSize: 14, color: '#000000', fontWeight: '500' }}>Downloading...</Text>
                  </>
                )}
                {downloadStatus === 'sharing' && (
                  <>
                    <ActivityIndicator size="large" color="#000000" />
                    <Text style={{ marginTop: 10, fontFamily: 'Inter', fontSize: 14, color: '#000000', fontWeight: '500' }}>Preparing...</Text>
                  </>
                )}
                {downloadStatus === 'success' && (
                  <>
                    <Check size={40} color="#00C853" />
                    <Text style={{ marginTop: 10, fontFamily: 'Inter', fontSize: 14, color: '#000000', fontWeight: '500' }}>Saved!</Text>
                  </>
                )}
                {downloadStatus === 'error' && (
                  <>
                    <X size={40} color="#FF3B30" />
                    <Text style={{ marginTop: 10, fontFamily: 'Inter', fontSize: 14, color: '#000000', fontWeight: '500' }}>Failed</Text>
                  </>
                )}
              </BlurView>
            </View>
          )}
        </View>
      </Modal>

      {/* Long-Press Menu Modal */}
      {!!longPressedMessage && (
        <View style={StyleSheet.absoluteFill}>
          <BlurView style={StyleSheet.absoluteFill} intensity={80} tint="light" />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setLongPressedMessage(null);
              setPressedMessageLayout(null);
            }}
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {pressedMessageLayout && longPressedMessage && (() => {
              const spaceBelow = screenHeight - (pressedMessageLayout.y + pressedMessageLayout.height);
              const menuHeight = 250; // Estimated menu height
              const showMenuBelow = spaceBelow > menuHeight + 40;

              return (
                <View style={{ flex: 1 }}>
                  {(['IMAGE', 'VIDEO', 'AUDIO', 'GIF', 'STICKER'].includes(longPressedMessage.type)) ? (
                    /* Large Media Layout */
                    <>
                      <View style={{
                        position: 'absolute',
                        top: (screenHeight - 300) / 2,
                        left: 20,
                        width: screenWidth - 40,
                        height: 300,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                        elevation: 10,
                      }}>
                        {longPressedMessage.type === 'AUDIO' ? (
                          <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'transparent' }}>
                            <ExtendedAudioPlayer source={longPressedMessage.content} />
                          </View>
                        ) : longPressedMessage.type === 'VIDEO' ? (
                          <View style={{ width: screenWidth - 40, height: 300, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderRadius: 14 }}>
                            <View style={styles.playOverlay}>
                              <Play size={48} color="#FFFFFF" fill="#FFFFFF" />
                            </View>
                          </View>
                        ) : longPressedMessage.content.trim().startsWith('[') ? (() => {
                          let mediaItems = [];
                          try { mediaItems = JSON.parse(longPressedMessage.content); } catch (e) { mediaItems = []; }
                          return (
                            <ScrollView
                              horizontal
                              pagingEnabled
                              showsHorizontalScrollIndicator={false}
                              style={{ width: screenWidth - 40, height: 300, borderRadius: 14 }}
                              onMomentumScrollEnd={(e) => {
                                const offset = e.nativeEvent.contentOffset.x;
                                const index = Math.round(offset / (screenWidth - 40));
                                currentImageIndexRef.current = index;
                              }}
                            >
                              {mediaItems.map((media, idx) => (
                                <Image
                                  key={idx}
                                  source={{ uri: typeof media === 'string' ? media : media.url }}
                                  style={{ width: screenWidth - 40, height: 300 }}
                                  resizeMode="cover"
                                />
                              ))}
                            </ScrollView>
                          );
                        })() : longPressedMessage.type === 'STICKER' ? (
                          <Image source={{ uri: longPressedMessage.content }} style={{ width: screenWidth - 40, height: 300, borderRadius: 14 }} resizeMode="contain" />
                        ) : (
                          <Image source={{ uri: longPressedMessage.content }} style={{ width: screenWidth - 40, height: 300, borderRadius: 14 }} resizeMode="cover" />
                        )}
                      </View>

                      {/* Reaction Bar (Above Media) */}
                      <View style={{
                        position: 'absolute',
                        top: (screenHeight - 300) / 2 - 60,
                        left: 20,
                        flexDirection: 'row',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 30,
                        paddingHorizontal: 15,
                        paddingVertical: 10,
                        alignItems: 'center',
                        gap: 15,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 5,
                      }}>
                        {['❤️', '😂', '😮', '😢', '😡', '👍'].map((emoji) => (
                          <TouchableOpacity key={emoji} onPress={() => {
                            handleReact(longPressedMessage.id, emoji);
                            setLongPressedMessage(null);
                            setPressedMessageLayout(null);
                          }}>
                            <Image source={{ uri: getAppleEmojiUrl(emoji) }} style={{ width: 28, height: 28 }} resizeMode="contain" />
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => {
                          setReactingToMessage(longPressedMessage);
                          setLongPressedMessage(null);
                          setPressedMessageLayout(null);
                          setShowEmojiPicker(true);
                        }}>
                          <Plus size={24} color="#8E8E93" />
                        </TouchableOpacity>
                      </View>

                      {/* Pop-up Menu (Below Media) */}
                      <View style={{
                        position: 'absolute',
                        top: (screenHeight - 300) / 2 + 320,
                        left: screenWidth - 220,
                        width: 200,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 5,
                      }}>
                        {longPressedMessage.type !== 'AUDIO' && (
                          <TouchableOpacity style={styles.menuItem} onPress={() => {
                            if (longPressedMessage.type === 'IMAGE' && longPressedMessage.content.trim().startsWith('[')) {
                              let mediaItems = [];
                              try { mediaItems = JSON.parse(longPressedMessage.content); } catch (e) { mediaItems = []; }
                              const selectedImage = mediaItems[currentImageIndexRef.current];
                              if (selectedImage) {
                                setSelectedMedia({
                                  ...longPressedMessage,
                                  content: typeof selectedImage === 'string' ? selectedImage : selectedImage.url,
                                  type: typeof selectedImage === 'string' ? 'IMAGE' : (selectedImage.type || 'IMAGE')
                                });
                              }
                            } else {
                              setSelectedMedia(longPressedMessage);
                            }
                            setLongPressedMessage(null);
                            setPressedMessageLayout(null);
                          }}>
                            <Text style={[styles.menuItemText, { color: '#000000' }]}>View</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                          handleReply(longPressedMessage);
                          setLongPressedMessage(null);
                          setPressedMessageLayout(null);
                        }}>
                          <Text style={[styles.menuItemText, { color: '#000000' }]}>Reply</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                          handleSaveMedia(longPressedMessage);
                        }}>
                          <Text style={[styles.menuItemText, { color: '#000000' }]}>Save</Text>
                        </TouchableOpacity>
                        {longPressedMessage.sender_id === user.id && (
                          <TouchableOpacity style={styles.menuItem} onPress={() => {
                            handleDelete(longPressedMessage.id);
                            setLongPressedMessage(null);
                            setPressedMessageLayout(null);
                          }}>
                            <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Delete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  ) : (
                    /* Regular Cloned Layout */
                    <>
                      {/* Cloned Message Bubble */}
                      <View style={{
                        position: 'absolute',
                        top: pressedMessageLayout.y,
                        left: pressedMessageLayout.x,
                        width: pressedMessageLayout.width,
                      }}>
                        <View style={[
                          styles.bubble,
                          longPressedMessage.sender_id === user.id ? styles.bubbleMe : styles.bubblePartner,
                          { marginVertical: 0 } // Reset margin
                        ]}>
                          {longPressedMessage.type === 'TEXT' ? (
                            <EmojiText style={[styles.messageText, longPressedMessage.sender_id === user.id ? styles.textMe : styles.textPartner]}>
                              {longPressedMessage.content}
                            </EmojiText>
                          ) : longPressedMessage.type === 'IMAGE' ? (
                            <Image source={{ uri: longPressedMessage.content }} style={styles.mediaImage} resizeMode="cover" />
                          ) : longPressedMessage.type === 'VIDEO' ? (
                            <View style={styles.mediaThumbnail}>
                              <View style={styles.playOverlay}>
                                <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
                              </View>
                              <Text style={[styles.messageText, longPressedMessage.sender_id === user.id ? styles.textMe : styles.textPartner]}>
                                🎬 Video
                              </Text>
                            </View>
                          ) : longPressedMessage.type === 'GIF' ? (
                            <Image source={{ uri: longPressedMessage.content }} style={styles.gifMessage} resizeMode="cover" />
                          ) : longPressedMessage.type === 'STICKER' ? (
                            <Image source={{ uri: longPressedMessage.content }} style={styles.stickerMessage} resizeMode="contain" />
                          ) : (
                            <Text style={[styles.messageText, longPressedMessage.sender_id === user.id ? styles.textMe : styles.textPartner]}>
                              Media/File
                            </Text>
                          )}
                        </View>
                        <Text style={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: 11,
                          marginTop: 4,
                          alignSelf: longPressedMessage.sender_id === user.id ? 'flex-end' : 'flex-start',
                          marginRight: 4,
                          marginLeft: 4
                        }}>
                          {formatTime(longPressedMessage.created_at)}
                        </Text>
                      </View>

                      {/* Container for Reaction Bar and Menu */}
                      <View style={{
                        position: 'absolute',
                        ...(showMenuBelow
                          ? { top: pressedMessageLayout.y + pressedMessageLayout.height + 10 }
                          : { bottom: screenHeight - pressedMessageLayout.y + 10 }
                        ),
                        left: Math.max(10, Math.min(pressedMessageLayout.x, screenWidth - 320)),
                        width: 320,
                      }}>
                        {/* Reaction Bar */}
                        <View style={{
                          flexDirection: 'row',
                          backgroundColor: '#FFFFFF',
                          borderRadius: 30,
                          paddingHorizontal: 15,
                          paddingVertical: 10,
                          alignItems: 'center',
                          gap: 15,
                          marginBottom: 10, // Space between pill and menu
                          alignSelf: 'flex-start',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.1,
                          shadowRadius: 12,
                          elevation: 5,
                        }}>
                          {['❤️', '😂', '😮', '😢', '😡', '👍'].map((emoji) => (
                            <TouchableOpacity key={emoji} onPress={() => {
                              handleReact(longPressedMessage.id, emoji);
                              setLongPressedMessage(null);
                              setPressedMessageLayout(null);
                            }}>
                              <Image source={{ uri: getAppleEmojiUrl(emoji) }} style={{ width: 28, height: 28 }} resizeMode="contain" />
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity onPress={() => {
                            setReactingToMessage(longPressedMessage);
                            setLongPressedMessage(null);
                            setPressedMessageLayout(null);
                            setShowEmojiPicker(true);
                          }}>
                            <Plus size={24} color="#8E8E93" />
                          </TouchableOpacity>
                        </View>

                        {/* Pop-up Menu */}
                        <View style={{
                          width: 200,
                          backgroundColor: '#FFFFFF',
                          borderRadius: 12,
                          overflow: 'hidden',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.1,
                          shadowRadius: 12,
                          elevation: 5,
                        }}>
                          {/* Timestamp */}
                          <View style={{ padding: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' }}>
                            <Text style={{ color: '#8E8E93', fontSize: 12 }}>
                              {formatTime(longPressedMessage.created_at)}
                            </Text>
                          </View>

                          {/* Reply */}
                          <TouchableOpacity style={styles.menuItem} onPress={() => {
                            handleReply(longPressedMessage);
                            setLongPressedMessage(null);
                            setPressedMessageLayout(null);
                          }}>
                            <Text style={[styles.menuItemText, { color: '#000000' }]}>Reply</Text>
                          </TouchableOpacity>

                          {/* Copy (only for text) */}
                          {longPressedMessage.type === 'TEXT' && (
                            <TouchableOpacity style={styles.menuItem} onPress={() => {
                              Clipboard.setString(longPressedMessage.content);
                              setLongPressedMessage(null);
                              setPressedMessageLayout(null);
                              Alert.alert('Copied', 'Message copied to clipboard.');
                            }}>
                              <Text style={[styles.menuItemText, { color: '#000000' }]}>Copy</Text>
                            </TouchableOpacity>
                          )}

                          {/* Edit (only for own text messages) */}
                          {longPressedMessage.type === 'TEXT' && longPressedMessage.sender_id === user.id && (
                            <TouchableOpacity style={styles.menuItem} onPress={() => {
                              handleEdit(longPressedMessage);
                              setLongPressedMessage(null);
                              setPressedMessageLayout(null);
                            }}>
                              <Text style={[styles.menuItemText, { color: '#000000' }]}>Edit</Text>
                            </TouchableOpacity>
                          )}

                          {/* Delete (only for own messages) */}
                          {longPressedMessage.sender_id === user.id && (
                            <TouchableOpacity style={styles.menuItem} onPress={() => {
                              handleDelete(longPressedMessage.id);
                              setLongPressedMessage(null);
                              setPressedMessageLayout(null);
                            }}>
                              <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Delete</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </>
                  )}
                </View>
              );
            })()}
          </View>
        </View>
      )}

      {/* Global HUD for downloads/shares outside modals */}
      {downloadStatus && !selectedMedia && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.1)' }]} pointerEvents="none">
          <BlurView intensity={100} tint="light" style={{ width: 140, height: 140, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.75)' }}>
            {downloadStatus === 'loading' && (
              <>
                <ActivityIndicator size="large" color="#000000" />
                <Text style={{ marginTop: 10, fontFamily: 'Inter', fontSize: 14, color: '#000000', fontWeight: '500' }}>Downloading...</Text>
              </>
            )}
            {downloadStatus === 'sharing' && (
              <>
                <ActivityIndicator size="large" color="#000000" />
                <Text style={{ marginTop: 10, fontFamily: 'Inter', fontSize: 14, color: '#000000', fontWeight: '500' }}>Preparing...</Text>
              </>
            )}
            {downloadStatus === 'success' && (
              <>
                <Check size={40} color="#00C853" />
                <Text style={{ marginTop: 10, fontFamily: 'Inter', fontSize: 14, color: '#000000', fontWeight: '500' }}>Saved!</Text>
              </>
            )}
            {downloadStatus === 'error' && (
              <>
                <X size={40} color="#FF3B30" />
                <Text style={{ marginTop: 10, fontFamily: 'Inter', fontSize: 14, color: '#000000', fontWeight: '500' }}>Failed</Text>
              </>
            )}
          </BlurView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 1,
  },
  headerIconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  headerCenter: { alignItems: 'center' },
  partnerAvatarLargeWrap: { width: 56, height: 56, marginBottom: 6 },
  partnerAvatarLarge: { width: 56, height: 56, borderRadius: 28 },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#30D158', borderWidth: 2, borderColor: '#FFFFFF',
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  partnerName: {
    fontFamily: 'Metropolis', fontSize: 15, fontWeight: '600', color: '#1B1B1B',
  },
  chevron: { fontSize: 18, color: '#5D5E60' },
  listContent: { paddingHorizontal: 16 },
  dateSeparator: { alignItems: 'center', marginVertical: 20 },
  dateSeparatorText: {
    fontFamily: 'Metropolis', fontSize: 22, fontWeight: '700',
    color: '#1B1B1B', letterSpacing: -0.5,
  },

  // Messages
  messageRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  rowMe: { justifyContent: 'flex-end' },
  rowPartner: { justifyContent: 'flex-start' },
  partnerAvatarSmall: {
    width: 28, height: 28, borderRadius: 14, marginRight: 8, marginBottom: 2,
  },
  bubbleColumn: { maxWidth: '75%', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 16, paddingVertical: 11 },
  noBubble: { padding: 4 },
  bubbleMe: {
    backgroundColor: 'rgba(0, 122, 255, 0.7)', borderRadius: 20, borderBottomRightRadius: 5,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bubblePartner: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 20, borderBottomLeftRadius: 5,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  messageText: { fontSize: 16, fontFamily: 'Inter', lineHeight: 22 },
  textMe: { color: '#FFFFFF' },
  textPartner: { color: '#1C1C1E' },
  timestamp: {
    fontFamily: 'Inter', fontSize: 11, color: '#5D5E60', marginTop: 3, marginRight: 4,
  },

  // Media
  mediaImage: { width: 200, height: 200, borderRadius: 14 },
  stackContainer: { width: 220, marginBottom: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  groupHeaderText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: '#007AFF' },
  stack: { height: 220, position: 'relative', width: 220 },
  stackImage: { width: 200, height: 200, borderRadius: 14, position: 'absolute', bottom: 0, left: 0 },
  stackMiddle: { transform: [{ translateX: 10 }, { translateY: -10 }, { rotate: '2deg' }] },
  stackBack: { transform: [{ translateX: 20 }, { translateY: -20 }, { rotate: '4deg' }] },
  mediaThumbnail: {
    width: 200, height: 150, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  playOverlay: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  gifMessage: { width: 200, height: 200, borderRadius: 14 },
  stickerMessage: { width: 96, height: 96 },

  // Audio
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 160 },
  audioPlayBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center',
  },
  audioPlayBtnActive: { backgroundColor: '#FF3B30' },
  audioWaveform: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  audioBar: { width: 3, borderRadius: 1.5 },
  audioDuration: { fontFamily: 'Inter', fontSize: 11, color: '#5D5E60' },

  // File
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 180 },
  fileIcon: { fontSize: 28 },
  fileInfo: { flex: 1 },
  fileName: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  fileSize: { fontFamily: 'Inter', fontSize: 11, marginTop: 2 },

  // Input Bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 10, gap: 8,
  },
  plusButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  inputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 44,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5,

  },
  textInput: {
    flex: 1, fontFamily: 'Inter', fontSize: 16, color: '#1B1B1B', maxHeight: 100,
  },
  micButton: { marginLeft: 8 },
  sendButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 5, elevation: 2,
  },

  // Modal Pop-out
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Long-Press Menu
  menuModalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  reactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#F2F2F7',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  actionMenu: {
    backgroundColor: '#FFFFFF',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  menuItemText: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#000000',
  },

  // Reaction Chips
  reactionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  reactionChip: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  reactionChipText: {
    fontSize: 12,
    color: '#1C1C1E',
  },
  indicatorText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontStyle: 'italic',
  },

  // Reply Preview
  replyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  replyPreviewContent: {
    flex: 1,
    marginRight: 8,
  },
  replyPreviewTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  replyPreviewText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#3A3A3C',
  },

  // Reply Snippet in bubble
  replySnippet: {
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  replySnippetMe: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderLeftColor: '#FFFFFF',
  },
  replySnippetPartner: {
    backgroundColor: '#E5E5EA',
    borderLeftColor: '#007AFF',
  },
  replySnippetTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  replySnippetText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#3A3A3C',
  },

  // Media Viewer
  mediaModalBackground: {
    flex: 1,
    justifyContent: 'space-between',
  },
  mainMediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullVideo: {
    width: '100%',
    height: '100%',
  },
  carouselContainer: {
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  carouselThumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  carouselThumbnailActive: {
    borderColor: '#007AFF',
  },
  carouselThumbnail: {
    width: '100%',
    height: '100%',
  },
  carouselVideoThumbnail: {
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Recording Modal
  recordingModalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  recordingCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  recordingMicWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingMicCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  recordingTimer: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  recordingWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    gap: 3,
    marginBottom: 24,
  },
  recordingBar: {
    width: 3,
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
  },
  recordingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  recordingActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingSendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentsPreviewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9F9F9',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  attachmentPreviewItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EFEFF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentPreviewImage: {
    width: '100%',
    height: '100%',
  },
  attachmentPreviewIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentPreviewVideoIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 2,
  },
  attachmentRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
