/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * --- PRINCIPIO NO NEGOCIABLE: LÍMITES CLÍNICOS ---
 * Esta app NO diagnostica, no clasifica trastornos, ni infiere "enfermedades" o cuadros clínicos.
 * ---
 */

// Uses Web Crypto API for client-side E2EE
const encoder = new TextEncoder();

/**
 * Generates a random salt.
 * IMPORTANT: MUST be called ONLY ONCE during user registration.
 * The resulting salt must be saved in the user profile and reused for all future
 * PBKDF2 derivations. Never call this again after registration.
 */
export function generateSalt(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

export async function deriveKey(pinOrPhrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(pinOrPhrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 600000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

// AES-GCM wrapping for the DEK
export async function generateDEK(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function wrapDEK(dek: CryptoKey, kek: CryptoKey): Promise<{ iv: Uint8Array, wrappedKey: ArrayBuffer }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const wrappedKey = await window.crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv });
  return { iv, wrappedKey };
}

export async function unwrapDEK(wrappedKey: ArrayBuffer, kek: CryptoKey, iv: Uint8Array): Promise<CryptoKey> {
  return window.crypto.subtle.unwrapKey(
    'raw',
    wrappedKey,
    kek,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string, key: CryptoKey): Promise<{ iv: Uint8Array, ciphertext: ArrayBuffer }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );
  return { iv, ciphertext };
}

export async function decryptData(ciphertext: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}
