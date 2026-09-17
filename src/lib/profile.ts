import { deriveKey, unwrapDEK, decryptData } from './encryption';
import { getProfile } from './firestoreService';

const base64ToUint8 = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export async function decryptUserProfile(uid: string, pin: string) {
  try {
    const data = await getProfile();
    if (!data) {
      throw new Error('Failed to fetch profile');
    }

    const salt = base64ToUint8(data.salt);
    const kek = await deriveKey(pin, salt);

    const wrappedKey = base64ToUint8(data.wrappedKey).buffer;
    const dekIv = base64ToUint8(data.dekIv);
    const dek = await unwrapDEK(wrappedKey, kek, dekIv);

    const iv = base64ToUint8(data.iv);
    const ciphertext = base64ToUint8(data.payload).buffer;
    const answersString = await decryptData(ciphertext, dek, iv);

    return JSON.parse(answersString);
  } catch (err: any) {
    console.error('Decryption failed:', err);
    // Explicitly hide technical error details from user
    if (err.message === 'Unauthorized') throw new Error('Acceso no autorizado');
    throw new Error('PIN incorrecto o datos dañados');
  }
}
