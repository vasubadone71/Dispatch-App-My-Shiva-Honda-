import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Standard pure JS SHA-256 implementation for lightweight cryptographic fingerprint hashing.
 * Avoids native dependency issues on older or low-end Android devices.
 */
function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = 0xffffffff;
  
  const h = [];
  const r = [];
  let primeCounter = 0;

  const isPrime = (n) => {
    for (let factor = 2; factor <= Math.sqrt(n); factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };

  while (primeCounter < 64) {
    if (isPrime(primeCounter + 2)) {
      if (h.length < 8) {
        h.push((mathPow(primeCounter + 2, 0.5) * 0x100000000) | 0);
      }
      r.push((mathPow(primeCounter + 2, 1 / 3) * 0x100000000) | 0);
      primeCounter++;
    }
    primeCounter++;
  }

  let words = [];
  let asciiLength = ascii.length * 8;
  
  // Padding
  ascii += String.fromCharCode(0x80);
  while ((ascii.length % 64) - 56) {
    ascii += String.fromCharCode(0);
  }
  
  for (let i = 0; i < ascii.length; i++) {
    const charCode = ascii.charCodeAt(i);
    if (charCode > 255) return null; // Only handle ASCII characters
    words[(i >> 2)] |= charCode << (24 - (i % 4) * 8);
  }
  
  words[words.length] = (asciiLength / 0x100000000) | 0;
  words[words.length] = asciiLength | 0;

  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = h.slice(0);

    for (let i = 0; i < 64; i++) {
      if (i >= 16) {
        const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }

      const ch = (h[4] & h[5]) ^ (~h[4] & h[6]);
      const maj = (h[0] & h[1]) ^ (h[0] & h[2]) ^ (h[1] & h[2]);
      const temp1 = (h[7] + (rightRotate(h[4], 6) ^ rightRotate(h[4], 11) ^ rightRotate(h[4], 25)) + ch + r[i] + w[i]) | 0;
      const temp2 = ((rightRotate(h[0], 2) ^ rightRotate(h[0], 13) ^ rightRotate(h[0], 22)) + maj) | 0;

      h[7] = h[6];
      h[6] = h[5];
      h[5] = h[4];
      h[4] = (h[3] + temp1) | 0;
      h[3] = h[2];
      h[2] = h[1];
      h[1] = h[0];
      h[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i++) {
      h[i] = (h[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    let word = h[i];
    if (word < 0) word += maxWord + 1;
    let hex = word.toString(16);
    while (hex.length < 8) hex = '0' + hex;
    result += hex;
  }
  return result;
}

/**
 * Gathers hardware specific fields and generates a consistent device fingerprint hash.
 */
export const getDeviceFingerprintData = async () => {
  try {
    let androidId = '';
    if (Platform.OS === 'android') {
      androidId = Application.androidId || '';
      if (!androidId && typeof Application.getAndroidId === 'function') {
        androidId = await Application.getAndroidId();
      }
    } else if (Platform.OS === 'ios') {
      androidId = await Application.getIosIdForVendorAsync();
    }

    const brand = Device.brand || 'UnknownBrand';
    const model = Device.modelName || 'UnknownModel';
    const osVersion = Device.osVersion || 'UnknownOS';
    const isEmulator = !Device.isDevice;

    // Concat fields securely. Adding a salt helps prevent basic dictionary attacks.
    const rawFingerprint = `badone_msh_${Platform.OS}_${brand}_${model}_${androidId}_motors`;
    const deviceHash = sha256(rawFingerprint);

    return {
      fingerprint: rawFingerprint,
      deviceHash,
      brand,
      model,
      osVersion,
      androidId,
      isEmulator,
    };
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Secure fallback: Generate a consistent placeholder but log failure
    const rawFingerprint = `badone_fallback_${Platform.OS}_${Device.brand || 'generic'}_${Device.modelName || 'device'}`;
    const fallbackAndroidId = 'FALLBACK_' + Platform.OS.toUpperCase();
    return {
      fingerprint: rawFingerprint,
      deviceHash: sha256(rawFingerprint),
      brand: Device.brand || 'Generic',
      model: Device.modelName || 'Device',
      osVersion: Device.osVersion || 'OS',
      androidId: fallbackAndroidId,
      isEmulator: !Device.isDevice,
    };
  }
};

/**
 * Basic security status check (emulator detection).
 */
export const checkSecurityIntegrity = async () => {
  const isEmulator = !Device.isDevice;
  return {
    isRooted: false, // Root detection can be added via custom native modules in future
    isEmulator,
    tampered: false,
  };
};
