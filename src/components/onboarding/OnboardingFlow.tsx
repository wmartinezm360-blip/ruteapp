import { useState } from 'react';
import Questionnaire from './Questionnaire';
import { deriveKey, encryptData, generateDEK, wrapDEK } from '../../lib/encryption';
import { saveProfile } from '../../lib/firestoreService';

interface OnboardingFlowProps {
  pin: string;
  salt: Uint8Array;
  uid: string;
  onComplete: () => void;
}

export default function OnboardingFlow({ pin, salt, uid, onComplete }: OnboardingFlowProps) {
  const [status, setStatus] = useState<'idle' | 'encrypting' | 'uploading' | 'complete' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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
      
      // 6. Enviar datos al servidor directo de Firestore (Client SDK)
      await saveProfile({
        payload: payloadBase64,
        iv: ivBase64,
        wrappedKey: wrappedKeyBase64,
        dekIv: dekIvBase64,
        salt: btoa(String.fromCharCode(...salt))
      });

      setStatus('complete');
      onComplete();
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error en el proceso.');
      setStatus('error');
    }
  };

  if (status === 'error') {
    return (
      <div className="p-10 text-center">
        <p className="font-semibold text-lg text-red-600">Error al guardar el perfil:</p>
        <p className="text-sm mt-2 bg-red-50 text-red-800 p-3 rounded-lg border border-red-100 max-w-md mx-auto inline-block">{errorMsg}</p>
        <button 
          onClick={() => setStatus('idle')}
          className="mt-4 block mx-auto px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 text-sm transition-colors font-medium"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }
  if (status === 'encrypting' || status === 'uploading') return <div className="p-10 text-center">Procesando de forma segura...</div>;

  return <Questionnaire onComplete={handleComplete} />;
}
