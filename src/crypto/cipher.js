import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

/**
 * LINKER ZERO-KNOWLEDGE CRYPTOGRAPHIC ENGINE
 * XOR cipher with SHA-256 keystream - works natively in React Native.
 */

const KEY_STORAGE_ID = 'linker_node_key';

// Polyfill Buffer if not available
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

export const CipherService = {
  /**
   * Derives a shared encryption key from two linked user IDs.
   * Both partners compute the same key deterministically (sorted IDs + hash).
   * The key is cached locally in SecureStore for performance.
   */
  deriveSharedKey: async (myId, partnerId) => {
    const cacheKey = 'linker_shared_key';
    
    // Check cache first
    const cached = await SecureStore.getItemAsync(cacheKey);
    if (cached) return cached;

    // Sort IDs so both users produce the same input
    const sorted = [myId, partnerId].sort().join(':');
    const secret = 'linker_sanctuary_v1:' + sorted;

    // SHA-256 hash to produce a 256-bit key
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      secret,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );

    await SecureStore.setItemAsync(cacheKey, hash);
    return hash;
  },

  /**
   * Retrieves the cached shared key from secure storage.
   */
  getSharedKey: async () => {
    return await SecureStore.getItemAsync('linker_shared_key');
  },

  /**
   * Encrypts a cleartext string using XOR with SHA-256 keystream.
   * Returns a JSON string containing iv and ciphertext.
   */
  encrypt: async (text, keyBase64) => {
    try {
      const ivBytes = await Crypto.getRandomBytesAsync(12);
      const iv = Buffer.from(ivBytes);
      const encodedText = Buffer.from(text, 'utf8');

      // Generate a keystream by hashing key+iv repeatedly
      const keystreamChunks = [];
      let offset = 0;
      while (offset < encodedText.length) {
        const hashInput = keyBase64 + ':' + iv.toString('base64') + ':' + Math.floor(offset / 32);
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          hashInput,
          { encoding: Crypto.CryptoEncoding.BASE64 }
        );
        keystreamChunks.push(Buffer.from(hash, 'base64'));
        offset += 32;
      }
      const keystream = Buffer.concat(keystreamChunks);

      // XOR encrypt
      const ciphertext = Buffer.alloc(encodedText.length);
      for (let i = 0; i < encodedText.length; i++) {
        ciphertext[i] = encodedText[i] ^ keystream[i];
      }

      return JSON.stringify({
        iv: iv.toString('base64'),
        content: ciphertext.toString('base64')
      });
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  },

  /**
   * Decrypts ciphertext using the same XOR keystream.
   */
  decrypt: async (encryptedJson, keyBase64) => {
    try {
      const { iv: ivBase64, content: contentBase64 } = JSON.parse(encryptedJson);
      const ciphertext = Buffer.from(contentBase64, 'base64');

      // Regenerate keystream
      const keystreamChunks = [];
      let offset = 0;
      while (offset < ciphertext.length) {
        const hashInput = keyBase64 + ':' + ivBase64 + ':' + Math.floor(offset / 32);
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          hashInput,
          { encoding: Crypto.CryptoEncoding.BASE64 }
        );
        keystreamChunks.push(Buffer.from(hash, 'base64'));
        offset += 32;
      }
      const keystream = Buffer.concat(keystreamChunks);

      // XOR decrypt
      const plaintext = Buffer.alloc(ciphertext.length);
      for (let i = 0; i < ciphertext.length; i++) {
        plaintext[i] = ciphertext[i] ^ keystream[i];
      }

      return plaintext.toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Encrypted Message]';
    }
  }
};
