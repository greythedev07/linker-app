import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

/**
 * ExtendedAudioPlayer
 * A modern, iOS-style audio player with custom controls for long-press expanded view.
 */

export const ExtendedAudioPlayer = ({ source, style, isActive = true }) => {
  const soundRef = useRef(null);
  const [status, setStatus] = useState({});
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  useEffect(() => {
    let currentSound;
    const initAudio = async () => {
      try {
        // Unload previous sound if any
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        
        const { sound: s } = await Audio.Sound.createAsync(
          { uri: source },
          { shouldPlay: isActive, rate: 1.0 },
          setStatus
        );
        currentSound = s;
        soundRef.current = s;
      } catch (e) {
        console.error("Audio Load Error:", e);
      }
    };
    if (source) {
      initAudio();
    }
    return () => {
      if (currentSound) currentSound.unloadAsync();
    };
  }, [source]);

  useEffect(() => {
    if (!isActive && soundRef.current && status.isPlaying) {
      soundRef.current.pauseAsync();
    }
  }, [isActive]);

  const togglePlay = () => {
    if (!soundRef.current) return;
    if (status.isPlaying) {
      soundRef.current.pauseAsync();
    } else {
      soundRef.current.playAsync();
    }
  };

  const toggleSpeed = async () => {
    if (!soundRef.current) return;
    const nextRate = playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
    await soundRef.current.setRateAsync(nextRate, true);
    setPlaybackRate(nextRate);
  };

  const handleSeek = async (evt) => {
    if (!soundRef.current || !status.durationMillis || progressBarWidth === 0) return;
    const { locationX } = evt.nativeEvent;
    const ratio = Math.max(0, Math.min(1, locationX / progressBarWidth));
    const seekPosition = ratio * status.durationMillis;
    await soundRef.current.setPositionAsync(seekPosition);
  };

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progress = status.durationMillis ? status.positionMillis / status.durationMillis : 0;

  return (
    <View style={[style, { backgroundColor: 'transparent' }]}>
      <BlurView intensity={90} tint="light" style={styles.controllerBar}>
        <TouchableOpacity onPress={togglePlay} style={styles.controlBtn}>
          {status.isPlaying ? (
            <Pause size={20} color="#007AFF" fill="#007AFF" />
          ) : (
            <Play size={20} color="#007AFF" fill="#007AFF" />
          )}
        </TouchableOpacity>

        <Text style={styles.timeText}>{formatTime(status.positionMillis)}</Text>

        {/* Progress Bar with Seek functionality */}
        <Pressable 
          style={styles.progressBarWrapper} 
          onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
          onPress={handleSeek}
        >
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
        </Pressable>

        <Text style={styles.timeText}>{formatTime(status.durationMillis)}</Text>

        <TouchableOpacity onPress={toggleSpeed} style={styles.speedBtn}>
          <Text style={styles.speedText}>{playbackRate}x</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  controllerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.8)', // Fallback for light theme
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  controlBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#1C1C1E',
    minWidth: 35,
    textAlign: 'center',
  },
  progressBarWrapper: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  speedBtn: {
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 16,
  },
  speedText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
});
