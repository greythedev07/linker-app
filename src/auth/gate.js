import { supabase } from '../lib/supabase';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * LINKER CUSTOM AUTHENTICATION LIFECYCLE
 * Client-side hashing and local session management.
 */

const hashPassword = async (password) => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
};

export const GateService = {
  /**
   * Custom Sign In
   */
  signIn: async (phone, password) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone_number', phone)
        .maybeSingle();

      if (error || !profile) {
        throw new Error('User not found.');
      }

      const hashedAttempt = await hashPassword(password);
      if (profile.password_hash !== hashedAttempt) {
        throw new Error('Invalid password.');
      }

      await SecureStore.setItemAsync('linker_session', JSON.stringify(profile));
      return { user: profile, error: null };
    } catch (error) {
      console.error('Sign In Error:', error.message);
      return { user: null, error: error.message };
    }
  },

  /**
   * Custom Sign Up
   */
  signUp: async (phone, password, nickname) => {
    try {
      // 1. Check if user exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', phone)
        .maybeSingle();

      if (existingUser) {
        throw new Error('Phone number already registered.');
      }

      // 2. Hash password and generate ID
      const password_hash = await hashPassword(password);
      const newId = Crypto.randomUUID();

      // 3. Insert into profiles
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          id: newId,
          phone_number: phone,
          password_hash: password_hash,
          display_name: nickname || 'Partner'
        })
        .select()
        .single();

      if (error) throw error;

      await SecureStore.setItemAsync('linker_session', JSON.stringify(newProfile));
      return { user: newProfile, error: null };
    } catch (error) {
      console.error('Sign Up Error:', error.message);
      return { user: null, error: error.message };
    }
  },

  /**
   * Custom Sign Out
   */
  signOut: async () => {
    await SecureStore.deleteItemAsync('linker_session');
    await SecureStore.deleteItemAsync('linker_node_key');
  },

  /**
   * Custom Get Session
   */
  getSession: async () => {
    try {
      const sessionString = await SecureStore.getItemAsync('linker_session');
      if (sessionString) {
        return JSON.parse(sessionString); // This returns the profile object representing the user
      }
      return null;
    } catch (error) {
      return null;
    }
  }
};
