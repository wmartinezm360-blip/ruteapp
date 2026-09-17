import { useState, useEffect } from 'react';
import { Eye, EyeOff, Delete, Shield, Lock, AlertCircle, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Home } from 'lucide-react';
import { generateSalt, deriveKey, generateDEK, wrapDEK } from '../../lib/encryption';

export default function ResetPinScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [status, setStatus] = useState<'idle' | 'no_token' | 'submitting' | 'success' | 'expired' | 'rate_limited' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recoveryToken = params.get('token');
    if (!recoveryToken || recoveryToken.trim() === '') {
      setStatus('no_token');
    } else {
      setToken(recoveryToken.trim());
    }
  }, []);

  const handleDigitPress = (digit: string) => {
    if (status === 'submitting' || status === 'success' || status === 'rate_limited') return;
    setErrorMsg(null);

    if (isConfirming) {
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
    if (status === 'submitting' || status === 'success') return;
    setErrorMsg(null);

    if (isConfirming) {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (status === 'submitting' || status === 'success') return;
    setErrorMsg(null);
    setPin('');
    setConfirmPin('');
    setIsConfirming(false);
  };

  const handleResetSubmission = async (finalPin: string) => {
    if (!token) {
      setStatus('no_token');
      return;
    }

    setStatus('submitting');
    setErrorMsg(null);

    try {
      // 1. Generar nuevo salt y derivar KEK con el nuevo PIN
      const salt = generateSalt();
      const kek = await deriveKey(finalPin, salt);

      // 2. Generar nueva DEK y envolverla con la KEK
      const dek = await generateDEK();
      const { iv: dekIv, wrappedKey } = await wrapDEK(dek, kek);

      // 3. Serializar la nueva DEK cifrada
      const wrappedKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(wrappedKey)));
      const dekIvBase64 = btoa(String.fromCharCode(...dekIv));
      const saltBase64 = btoa(String.fromCharCode(...salt));
      const newEncryptedDEK = JSON.stringify({
        wrappedKey: wrappedKeyBase64,
        dekIv: dekIvBase64,
        salt: saltBase64
      });

      // 4. Generar hash criptográfico SHA-256 para el nuevo PIN
      const encoder = new TextEncoder();
      const pinBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(finalPin));
      const newPinHash = Array.from(new Uint8Array(pinBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // 5. Enviar solicitud a /api/execute-reset
      const res = await fetch('/api/execute-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoveryToken: token,
          newPinHash,
          newSalt: saltBase64,
          newWrappedKey: wrappedKeyBase64,
          newDekIv: dekIvBase64,
          newEncryptedDEK
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorText = data.error || '';
        if (errorText.toLowerCase().includes('demasiados intentos') || errorText.toLowerCase().includes('too many')) {
          setStatus('rate_limited');
          setErrorMsg('Se superó el número máximo de intentos. Por seguridad, este enlace ha sido invalidado.');
        } else if (errorText.toLowerCase().includes('expirado') || errorText.toLowerCase().includes('inválido') || errorText.toLowerCase().includes('expired') || errorText.toLowerCase().includes('invalid')) {
          setStatus('expired');
          setErrorMsg('El enlace de recuperación es inválido o ha expirado. Los enlaces tienen una vigencia de 15 minutos.');
        } else {
          setStatus('error');
          setErrorMsg(errorText || 'Ocurrió un error al restablecer el PIN.');
        }
        return;
      }

      // 6. Éxito
      setStatus('success');
    } catch (err: any) {
      console.error('Error executing reset:', err);
      setStatus('error');
      setErrorMsg('Error de conexión al procesar el restablecimiento. Intenta nuevamente.');
    }
  };

  // Efecto para pasar a confirmación o ejecutar el reseteo al completar 6 dígitos
  useEffect(() => {
    if (!isConfirming && pin.length === 6) {
      setIsConfirming(true);
    } else if (isConfirming && confirmPin.length === 6 && status === 'idle') {
      if (pin === confirmPin) {
        handleResetSubmission(pin);
      } else {
        setErrorMsg('Los PINs no coinciden. Por favor ingresa tu nuevo PIN nuevamente.');
        setPin('');
        setConfirmPin('');
        setIsConfirming(false);
      }
    }
  }, [pin, confirmPin, isConfirming, status]);

  const activePinString = isConfirming ? confirmPin : pin;

  const navigateToHome = () => {
    window.location.href = '/';
  };

  // Vista: Sin token o enlace incompleto
  if (status === 'no_token') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-sm p-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight mb-2">
            Enlace inválido o incompleto
          </h1>
          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            No se encontró el token de recuperación en la dirección web. Por favor verifica que hayas abierto el enlace completo recibido en tu correo electrónico.
          </p>
          <button
            type="button"
            onClick={navigateToHome}
            className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-6 rounded-xl shadow transition duration-150 text-sm"
          >
            <Home className="w-4 h-4" />
            <span>Volver al inicio</span>
          </button>
        </div>
      </div>
    );
  }

  // Vista: Token Expirado / Inválido
  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-sm p-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight mb-2">
            Enlace expirado o no disponible
          </h1>
          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            {errorMsg || 'El enlace de recuperación es inválido o ya ha vencido su tiempo de vigencia de 15 minutos.'}
          </p>
          <button
            type="button"
            onClick={navigateToHome}
            className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-6 rounded-xl shadow transition duration-150 text-sm"
          >
            <Home className="w-4 h-4" />
            <span>Solicitar nuevo enlace en el inicio</span>
          </button>
        </div>
      </div>
    );
  }

  // Vista: Rate Limit / Demasiados intentos
  if (status === 'rate_limited') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-sm p-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4 border border-amber-200">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight mb-2">
            Límite de intentos alcanzado
          </h1>
          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            Por medidas de seguridad de tu cuenta, este enlace de recuperación ha sido desactivado tras varios intentos fallidos. Puedes solicitar un nuevo enlace desde tu cuenta.
          </p>
          <button
            type="button"
            onClick={navigateToHome}
            className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-6 rounded-xl shadow transition duration-150 text-sm"
          >
            <Home className="w-4 h-4" />
            <span>Volver a la pantalla principal</span>
          </button>
        </div>
      </div>
    );
  }

  // Vista: Éxito
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-sm p-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mb-2">
            ¡PIN restablecido con éxito!
          </h1>
          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            Tu nuevo PIN de seguridad de 6 dígitos ha sido configurado y vinculado a tu cuenta con cifrado de extremo a extremo.
          </p>
          <button
            type="button"
            onClick={navigateToHome}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-6 rounded-xl shadow transition duration-150 text-sm"
          >
            <span>Ir a Iniciar Sesión / Desbloquear</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Vista: Formulario de creación y confirmación de nuevo PIN
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-stone-50">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-stone-200 shadow-sm p-8 flex flex-col items-center">
        {/* Security Shield Icon */}
        <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center mb-4 shadow-sm">
          <Lock className="w-6 h-6" />
        </div>

        {/* Dynamic Titles */}
        <h1 className="text-xl font-bold text-stone-900 text-center tracking-tight">
          {isConfirming ? 'Confirma tu nuevo PIN' : 'Restablecer PIN de seguridad'}
        </h1>
        
        <p className="text-xs text-stone-500 text-center mt-1.5 mb-4">
          {isConfirming 
            ? 'Vuelve a introducir los 6 dígitos para confirmar.' 
            : 'Ingresa un nuevo PIN de 6 dígitos para proteger tu cuenta.'}
        </p>

        {/* Explicit Zero-Knowledge Reset Warning */}
        <div className="w-full mb-5 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <strong className="font-semibold block text-amber-950 mb-0.5">Aviso de seguridad Zero-Knowledge:</strong>
            Restablecer tu PIN sin conocer el anterior reiniciará tus datos de perfil cifrados. Tu progreso y respuestas anteriores no podrán recuperarse y deberás configurar tu perfil nuevamente tras ingresar.
          </div>
        </div>

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
        {status === 'submitting' && (
          <div className="flex items-center gap-2 text-xs font-medium text-stone-600 mb-4 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-stone-800" />
            <span>Generando claves y restableciendo PIN...</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
            <button 
              key={digit} 
              type="button"
              disabled={status === 'submitting'}
              onClick={() => handleDigitPress(digit.toString())}
              className="w-16 h-16 mx-auto rounded-2xl bg-stone-100/80 hover:bg-stone-200 active:bg-stone-300 text-stone-900 text-xl font-medium flex items-center justify-center transition disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button 
            type="button"
            disabled={status === 'submitting' || activePinString.length === 0}
            onClick={handleClear}
            className="w-16 h-16 mx-auto rounded-2xl text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center justify-center transition disabled:opacity-30"
          >
            Borrar
          </button>
          <button 
            type="button"
            disabled={status === 'submitting'}
            onClick={() => handleDigitPress('0')}
            className="w-16 h-16 mx-auto rounded-2xl bg-stone-100/80 hover:bg-stone-200 active:bg-stone-300 text-stone-900 text-xl font-medium flex items-center justify-center transition disabled:opacity-50"
          >
            0
          </button>
          <button 
            type="button"
            disabled={status === 'submitting' || activePinString.length === 0}
            onClick={handleBackspace} 
            className="w-16 h-16 mx-auto rounded-2xl bg-stone-100/80 hover:bg-stone-200 active:bg-stone-300 text-stone-700 flex items-center justify-center transition disabled:opacity-30"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Cancel / Home Option */}
        <div className="mt-8 pt-4 border-t border-stone-100 w-full text-center">
          <button
            type="button"
            onClick={navigateToHome}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 font-medium transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Cancelar y volver al inicio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
