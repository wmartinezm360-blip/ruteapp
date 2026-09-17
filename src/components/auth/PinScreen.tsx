import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Delete, Shield, Lock, AlertCircle, Loader2, LogOut } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { setupPin, verifyPin } from '../../lib/firestoreService';

interface PinScreenProps {
  mode: 'setup' | 'verify' | 'reset';
  uid?: string;
  onSuccess: (pin: string) => void;
  onLock?: () => void;
}

export default function PinScreen({ mode, uid, onSuccess, onLock }: PinScreenProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentUid = uid || auth.currentUser?.uid;

  const handleDigitPress = (digit: string) => {
    if (isLoading) return;
    setErrorMsg(null);

    if (mode === 'setup' && isConfirming) {
      if (confirmPin.length < 6) {
        setConfirmPin(prev => prev + digit);
      }
    } else {
      if (pin.length < 6) {
        setPin(prev => prev + digit);
      }
    }
  };

  const handleBackspace = () => {
    if (isLoading) return;
    setErrorMsg(null);

    if (mode === 'setup' && isConfirming) {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (isLoading) return;
    setErrorMsg(null);
    setPin('');
    setConfirmPin('');
    setIsConfirming(false);
  };

  const handleVerifySubmission = useCallback(async (pinToVerify: string) => {
    if (!currentUid) {
      setErrorMsg('No se encontró sesión de usuario activa.');
      setPin('');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await verifyPin(pinToVerify);
      onSuccess(pinToVerify);
    } catch (err: any) {
      console.error('Error verifying PIN:', err);
      const message = err.message === 'Invalid PIN'
        ? 'PIN incorrecto. Intenta de nuevo.'
        : err.message === 'User not found'
        ? 'Registro de PIN no encontrado. Por favor completa el registro.'
        : err.message || 'Error al verificar el PIN.';
      
      setErrorMsg(message);
      setPin('');

      if (message.toLowerCase().includes('wait') || message.toLowerCase().includes('attempts') || message.toLowerCase().includes('espera')) {
        onLock?.();
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUid, onLock, onSuccess]);

  const handleSetupCompletion = useCallback(async (finalPin: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await setupPin(finalPin);
      onSuccess(finalPin);
    } catch (err) {
      console.error('Error setting up PIN record:', err);
      // Even if backend auth record sync fails, allow E2EE onboarding with the derived key
      onSuccess(finalPin);
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);

  // Effect to process completed 6-digit inputs
  useEffect(() => {
    if (mode === 'verify') {
      if (pin.length === 6 && !isLoading) {
        handleVerifySubmission(pin);
      }
    } else if (mode === 'setup') {
      if (!isConfirming && pin.length === 6) {
        // Transition to confirmation step
        setIsConfirming(true);
      } else if (isConfirming && confirmPin.length === 6 && !isLoading) {
        if (pin === confirmPin) {
          handleSetupCompletion(pin);
        } else {
          setErrorMsg('Los PINs no coinciden. Por favor ingresa tu PIN nuevamente.');
          setPin('');
          setConfirmPin('');
          setIsConfirming(false);
        }
      }
    } else {
      // mode === 'reset'
      if (pin.length === 6) {
        onSuccess(pin);
      }
    }
  }, [pin, confirmPin, isConfirming, mode, isLoading, handleVerifySubmission, handleSetupCompletion, onSuccess]);

  const activePinString = mode === 'setup' && isConfirming ? confirmPin : pin;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-stone-50">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-stone-200 shadow-sm p-8 flex flex-col items-center">
        {/* Security Shield Icon */}
        <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center mb-4 shadow-sm">
          <Lock className="w-6 h-6" />
        </div>

        {/* Dynamic Titles */}
        <h1 className="text-xl font-bold text-stone-900 text-center tracking-tight">
          {mode === 'setup' 
            ? (isConfirming ? 'Confirma tu PIN' : 'Crea tu PIN de seguridad') 
            : 'Ingresa tu PIN'}
        </h1>
        
        <p className="text-xs text-stone-500 text-center mt-1.5 mb-6">
          {mode === 'setup'
            ? (isConfirming 
                ? 'Vuelve a introducir los 6 dígitos para verificar.' 
                : 'Protege tu perfil y registros con cifrado en tu dispositivo.')
            : 'Introduce tu PIN de 6 dígitos para desbloquear tu sesión.'}
        </p>

        {/* Error notification */}
        {errorMsg && (
          <div className="w-full mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PIN Digit Indicators */}
        <div className="flex items-center gap-3 mb-8">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`w-10 h-12 rounded-xl flex items-center justify-center text-lg font-semibold transition-all ${
                i < activePinString.length 
                  ? 'bg-stone-900 text-white shadow-sm scale-105' 
                  : 'bg-stone-50 border border-stone-300 text-stone-400'
              }`}
            >
              {showPin 
                ? (activePinString[i] || '') 
                : (i < activePinString.length ? '•' : '')}
            </div>
          ))}
          <button 
            type="button"
            onClick={() => setShowPin(!showPin)} 
            className="ml-1 p-2 text-stone-400 hover:text-stone-700 transition"
            title={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
          >
            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-medium text-stone-600 mb-4 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-stone-800" />
            <span>Verificando PIN de seguridad...</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
            <button 
              key={digit} 
              type="button"
              disabled={isLoading}
              onClick={() => handleDigitPress(digit.toString())}
              className="w-16 h-16 mx-auto rounded-2xl bg-stone-100/80 hover:bg-stone-200 active:bg-stone-300 text-stone-900 text-xl font-medium flex items-center justify-center transition disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button 
            type="button"
            disabled={isLoading || activePinString.length === 0}
            onClick={handleClear}
            className="w-16 h-16 mx-auto rounded-2xl text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center justify-center transition disabled:opacity-30"
          >
            Borrar
          </button>
          <button 
            type="button"
            disabled={isLoading}
            onClick={() => handleDigitPress('0')}
            className="w-16 h-16 mx-auto rounded-2xl bg-stone-100/80 hover:bg-stone-200 active:bg-stone-300 text-stone-900 text-xl font-medium flex items-center justify-center transition disabled:opacity-50"
          >
            0
          </button>
          <button 
            type="button"
            disabled={isLoading || activePinString.length === 0}
            onClick={handleBackspace} 
            className="w-16 h-16 mx-auto rounded-2xl bg-stone-100/80 hover:bg-stone-200 active:bg-stone-300 text-stone-700 flex items-center justify-center transition disabled:opacity-30"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Sign Out Option */}
        <div className="mt-8 pt-4 border-t border-stone-100 w-full text-center">
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión o cambiar cuenta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
