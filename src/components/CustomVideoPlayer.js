import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

/**
 * CustomVideoPlayer
 * A modern, iOS-style video player with custom controls.
 */

export const CustomVideoPlayer = ({ source, style, isActive }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!isActive && videoRef.current) {
      videoRef.current.pauseAsync();
    }
  }, [isActive]);

  const togglePlay = () => {
    if (status.isPlaying) {
      videoRef.current.pauseAsync();
    } else {
      videoRef.current.playAsync();
    }
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
      {/* Video Display */}
      <View style={{ width: '100%', height: '85%', backgroundColor: '#000', borderRadius: 14, overflow: 'hidden' }}>
        <Video
          ref={videoRef}
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          isLooping
          isMuted={isMuted}
          shouldPlay={true}
          onPlaybackStatusUpdate={setStatus}
        />
      </View>

      {/* Custom Controls (Outside display) */}
      <View style={{ height: '15%', justifyContent: 'center' }} pointerEvents="box-none">
        <BlurView intensity={90} tint="light" style={styles.controllerBar}>
          <TouchableOpacity onPress={togglePlay} style={styles.controlBtn}>
            {status.isPlaying ? (
              <Pause size={20} color="#007AFF" fill="#007AFF" />
            ) : (
              <Play size={20} color="#007AFF" fill="#007AFF" />
            )}
          </TouchableOpacity>

          <Text style={styles.timeText}>{formatTime(status.positionMillis)}</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>

          <Text style={styles.timeText}>{formatTime(status.durationMillis)}</Text>

          <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.controlBtn}>
            {isMuted ? (
              <VolumeX size={20} color="#007AFF" />
            ) : (
              <Volume2 size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controllerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    height: 20,
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2.5,
  },
});
