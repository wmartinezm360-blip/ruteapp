import { deriveKey, unwrapDEK, decryptData } from './encryption';
import { auth } from './firebase';

const base64ToUint8 = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export async function decryptUserProfile(uid: string, pin: string) {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`/api/get-profile?uid=${uid}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!response.ok) {
        if (response.status === 403) throw new Error('Unauthorized');
        throw new Error('Failed to fetch profile');
    }
    const data = await response.json();

    const salt = base64ToUint8(data.salt);
    const kek = await deriveKey(pin, salt);

    const wrappedKey = base64ToUint8(data.wrappedKey).buffer;
    const dekIv = base64ToUint8(data.dekIv);
    const dek = await unwrapDEK(wrappedKey, kek, dekIv);

    const iv = base64ToUint8(data.iv);
    const ciphertext = base64ToUint8(data.encrypted_payload).buffer;
    const answersString = await decryptData(ciphertext, dek, iv);

    return JSON.parse(answersString);
  } catch (err: any) {
    console.error('Decryption failed:', err);
    // Explicitly hide technical error details from user
    if (err.message === 'Unauthorized') throw new Error('Acceso no autorizado');
    throw new Error('PIN incorrecto o datos dañados');
  }
}
