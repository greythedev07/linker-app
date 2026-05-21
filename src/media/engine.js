import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { CipherService } from '../crypto/cipher';

/**
 * LINKER MULTIMEDIA ENGINE
 * Handles secure, encrypted media uploads to Supabase Storage.
 */

export const MediaEngine = {
  /**
   * Generic file uploader — reads file as base64, uploads to Supabase, encrypts URL.
   * Uses the Supabase REST API directly for reliable React Native uploads.
   */
  uploadAndEncrypt: async (uri, mimeType, key, messageType) => {
    try {
      const ext = mimeType.split('/').pop().split('+')[0].split(';')[0] || 'bin';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `uploads/${fileName}`;

      console.log('[MediaEngine] Uploading to Supabase via uploadAsync, path:', filePath);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || supabaseAnonKey;

      const uploadUrl = `${supabaseUrl}/storage/v1/object/our-space-media/${filePath}`;

      const response = await FileSystem.uploadAsync(uploadUrl, uri, {
        uploadType: 1, // 1 corresponds to FileSystemUploadType.BINARY
        httpMethod: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': mimeType,
        },
      });

      console.log('[MediaEngine] Upload response status:', response.status);

      if (response.status >= 400) {
        console.error('[MediaEngine] Upload error detail:', response.body);
        throw new Error(`Upload failed with status ${response.status}`);
      }

      console.log('[MediaEngine] Upload success:', response.body);

      const { data: { publicUrl } } = supabase.storage
        .from('our-space-media')
        .getPublicUrl(filePath);

      console.log('[MediaEngine] Public URL:', publicUrl);

      const encryptedUrl = await CipherService.encrypt(publicUrl, key);

      return { url: encryptedUrl, type: messageType };
    } catch (error) {
      console.error('[MediaEngine] Full error:', error.message, error.statusCode, error);
      throw error;
    }
  },

  /**
   * Opens the device gallery for images and videos.
   */
  pickMedia: async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      return result.assets;
    }
    return [];
  },

  /**
   * Opens a document picker filtered to audio files.
   */
  pickAudioFile: async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
      multiple: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      return result.assets;
    }
    return [];
  },

  /**
   * Opens a document picker for PDF, DOCX, and PPTX files.
   */
  pickDocument: async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
      copyToCacheDirectory: true,
      multiple: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      return result.assets;
    }
    return [];
  },
};
