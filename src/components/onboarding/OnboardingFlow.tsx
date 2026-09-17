import { useState } from 'react';
import Questionnaire from './Questionnaire';
import { deriveKey, encryptData, generateDEK, wrapDEK } from '../../lib/encryption';
import { auth } from '../../lib/firebase';

interface OnboardingFlowProps {
  pin: string;
  salt: Uint8Array;
  uid: string;
  onComplete: () => void;
}

export default function OnboardingFlow({ pin, salt, uid, onComplete }: OnboardingFlowProps) {
  const [status, setStatus] = useState<'idle' | 'encrypting' | 'uploading' | 'complete' | 'error'>('idle');

  const handleComplete = async (answers: Record<number, string>) => {
    setStatus('encrypting');
    try {
      // 1. Derivar KEK real
      const kek = await deriveKey(pin, salt);
      
      // 2. Generar DEK real
      const dek = await generateDEK();
      
      // 3. Cifrar respuestas con DEK
      const answersString = JSON.stringify(answers);
      const { iv, ciphertext } = await encryptData(answersString, dek);
      
      // 4. Envolver DEK con KEK
      const { iv: dekIv, wrappedKey } = await wrapDEK(dek, kek);
      
      // 5. Preparar formatos para backend
      const payloadBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
      const ivBase64 = btoa(String.fromCharCode(...iv));
      const wrappedKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(wrappedKey)));
      const dekIvBase64 = btoa(String.fromCharCode(...dekIv));

      setStatus('uploading');
      
      // 6. Enviar datos al servidor
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Usuario no autenticado.');

      const response = await fetch('/api/save-profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          uid,
          payload: payloadBase64,
          iv: ivBase64,
          wrappedKey: wrappedKeyBase64,
          dekIv: dekIvBase64,
          salt: btoa(String.fromCharCode(...salt))
        })
      });

      if (!response.ok) throw new Error('Failed to save profile');
      setStatus('complete');
      onComplete();
      
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (status === 'error') return <div className="p-10 text-center text-red-500">Error en el proceso.</div>;
  if (status === 'encrypting' || status === 'uploading') return <div className="p-10 text-center">Procesando de forma segura...</div>;

  return <Questionnaire onComplete={handleComplete} />;
}
