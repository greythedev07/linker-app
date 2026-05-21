import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Image,
} from 'react-native';

const DEFAULT_AVATAR = require('../../assets/default-avatar.png');
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { GateService } from '../auth/gate';
import {
  X,
  ChevronRight,
  User,
  MessageCircle,
  Shield,
  LogOut,
  Edit2,
  Check,
} from 'lucide-react-native';

export const SettingsScreen = ({ user, onClose, onSignOut, onNicknameUpdate }) => {
  const [nickname, setNickname] = useState(user?.display_name || '');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);

  const saveNickname = async () => {
    if (nickname.trim().length < 2) {
      Alert.alert('Invalid Nickname', 'Nickname must be at least 2 characters.');
      return;
    }
    setSavingNickname(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: nickname.trim() })
      .eq('id', user.id);
    setSavingNickname(false);

    if (error) {
      Alert.alert('Error', 'Failed to update nickname. Please try again.');
    } else {
      setIsEditingNickname(false);
      if (onNicknameUpdate) onNicknameUpdate(nickname.trim());
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await GateService.signOut();
            onSignOut();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#1B1B1B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={user?.avatar_url ? { uri: user.avatar_url } : DEFAULT_AVATAR}
            style={styles.avatarImage}
          />
          <View style={styles.profileInfo}>
            {isEditingNickname ? (
              <View style={styles.nicknameEditRow}>
                <TextInput
                  style={styles.nicknameInput}
                  value={nickname}
                  onChangeText={setNickname}
                  autoFocus
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={saveNickname}
                />
                <TouchableOpacity onPress={saveNickname} disabled={savingNickname} style={styles.saveButton}>
                  <Check size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.nicknameRow}>
                <Text style={styles.profileName}>{user?.display_name || 'No Nickname'}</Text>
                <TouchableOpacity onPress={() => setIsEditingNickname(true)} style={styles.editButton}>
                  <Edit2 size={14} color="#007AFF" />
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.profilePhone}>{user?.phone_number || ''}</Text>
          </View>
        </View>

        {/* Personal Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={14} color="#A0A0A0" />
            <Text style={styles.sectionTitle}>PERSONAL PROFILE</Text>
          </View>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => setIsEditingNickname(true)}
            >
              <Text style={styles.rowLabel}>Nickname</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{user?.display_name || 'Not set'}</Text>
                <ChevronRight size={16} color="#C7C7CC" />
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Contact Number</Text>
              <Text style={styles.rowValue}>{user?.phone_number || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Conversation Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MessageCircle size={14} color="#A0A0A0" />
            <Text style={styles.sectionTitle}>CONVERSATION</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Notifications</Text>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: '#E2E2E2', true: '#007AFF' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={14} color="#A0A0A0" />
            <Text style={styles.sectionTitle}>PRIVACY & SECURITY</Text>
          </View>
          <View style={styles.privacyCard}>
            <Shield size={20} color="#30D158" style={{ marginBottom: 10 }} />
            <Text style={styles.privacyTitle}>End-to-End Encrypted</Text>
            <Text style={styles.privacyText}>
              Your Linker connection is secured with end-to-end encryption. No one outside this sanctuary — not even Linker — can read your messages.
            </Text>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={18} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F2F2F7',
  },
  headerTitle: {
    fontFamily: 'Metropolis',
    fontSize: 18,
    fontWeight: '700',
    color: '#1B1B1B',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 18,
    padding: 20,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontFamily: 'Metropolis',
    fontSize: 20,
    fontWeight: '700',
    color: '#1B1B1B',
  },
  editButton: {
    padding: 4,
  },
  nicknameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nicknameInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#1B1B1B',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    paddingBottom: 2,
  },
  saveButton: {
    padding: 4,
  },
  profilePhone: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  section: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#A0A0A0',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowLabel: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#1B1B1B',
  },
  rowValue: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#8E8E93',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E2E2E2',
    marginLeft: 18,
  },
  privacyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  privacyTitle: {
    fontFamily: 'Metropolis',
    fontSize: 16,
    fontWeight: '700',
    color: '#1B1B1B',
    marginBottom: 8,
  },
  privacyText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#5D5E60',
    textAlign: 'center',
    lineHeight: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
  },
  signOutText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
