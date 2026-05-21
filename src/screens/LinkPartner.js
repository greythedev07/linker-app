import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { CipherService } from '../crypto/cipher';

export const LinkPartner = ({ user, onLinkSuccess, onSignOut }) => {
  const [partnerNumber, setPartnerNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    if (partnerNumber.trim().length < 5) {
      Alert.alert('Invalid Number', 'Please enter your partner\'s valid contact number.');
      return;
    }

    setLoading(true);
    try {
      // 1. Search for the partner by contact number (stored in phone_number column)
      const { data: partner, error } = await supabase
        .from('profiles')
        .select('id, phone_number, linked_partner_id')
        .eq('phone_number', partnerNumber.trim())
        .maybeSingle();

      if (error || !partner) {
        throw new Error('Partner not found. Ensure they have registered first.');
      }

      if (partner.id === user.id) {
        throw new Error('You cannot link with yourself.');
      }

      if (partner.linked_partner_id) {
        throw new Error('This contact number is already linked to someone else.');
      }

      // 2. Mutual Link Update
      const { error: linkError1 } = await supabase
        .from('profiles')
        .update({ linked_partner_id: partner.id })
        .eq('id', user.id);

      const { error: linkError2 } = await supabase
        .from('profiles')
        .update({ linked_partner_id: user.id })
        .eq('id', partner.id);

      if (linkError1 || linkError2) throw new Error('Failed to establish link.');

      // 3. Initialize Cryptographic Handshake
      await CipherService.generateNodeKey();
      
      onLinkSuccess();
    } catch (error) {
      Alert.alert('Link Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Secure Link</Text>
          <Text style={styles.subtitle}>
            Enter your partner's contact number to establish an immutable 1:1 encrypted channel.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Partner's Contact Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 234 567 8900"
            placeholderTextColor="#A0A0A0"
            autoCapitalize="none"
            keyboardType="phone-pad"
            value={partnerNumber}
            onChangeText={setPartnerNumber}
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLink}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Establish Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Warning: This link is permanent. Once established, you can only communicate with this specific partner.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Metropolis',
    fontSize: 28,
    fontWeight: '700',
    color: '#1B1B1B',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#5D5E60',
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#A0A0A0',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 60,
    backgroundColor: '#F3F3F3',
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 18,
    fontFamily: 'Inter',
    color: '#1B1B1B',
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: '#007AFF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  signOutButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  signOutText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#5D5E60',
    textDecorationLine: 'underline',
  },
  warningBox: {
    marginTop: 40,
    backgroundColor: '#FFF8F8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEAEA',
  },
  warningText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
    lineHeight: 18,
  }
});
