import { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import logoCorporativo from '../public/logo corporativo.png';

export default function AuthScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatAuthError = (errCode: string, defaultMsg: string): string => {
    const code = errCode || '';
    const msg = defaultMsg || '';
    if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain') || msg.includes('unauthorized-domain')) {
      return `Dominio no autorizado para inicio de sesión con Google. Para solucionarlo, ve a tu Consola de Firebase (Authentication -> Ajustes -> Dominios Autorizados) y agrega este dominio: "${window.location.hostname}"`;
    }

    switch (errCode) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Correo o contraseña incorrectos. Por favor, verifica tus datos.';
      case 'auth/email-already-in-use':
        return 'Ya existe una cuenta registrada con este correo. Por favor, inicia sesión.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'El formato del correo electrónico no es válido.';
      case 'auth/popup-closed-by-user':
        return 'La ventana de inicio de sesión de Google fue cerrada antes de completar.';
      case 'auth/unauthorized-domain':
        return `Dominio no autorizado para inicio de sesión con Google. Para solucionarlo, ve a tu Consola de Firebase (Authentication -> Ajustes -> Dominios Autorizados) y agrega este dominio: "${window.location.hostname}"`;
      case 'auth/operation-not-allowed':
        return 'El método de autenticación seleccionado no está habilitado en la consola de Firebase. Se recomienda usar Google Sign-In.';
      default:
        return defaultMsg || 'Ocurrió un error al autenticar. Intenta nuevamente.';
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setError(formatAuthError(err.code, err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Email Auth error:', err);
      setError(formatAuthError(err.code, err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
        {/* Brand & Security Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src={logoCorporativo} 
              alt="Logo Corporativo" 
              className="h-16 w-auto object-contain max-w-full" 
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Bienestar & Salud Mental
          </h1>
          <p className="text-sm text-stone-600 mt-2">
            Tu espacio confidencial con cifrado de extremo a extremo en dispositivo.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-800 font-medium py-3 px-4 rounded-xl border border-stone-300 shadow-sm transition duration-150 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-stone-600" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Continuar con Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-stone-600 font-medium">
              o con correo electrónico
            </span>
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@correo.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-sm bg-stone-50 focus:bg-white transition"
              />
              <Mail className="w-4 h-4 text-stone-600 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-sm bg-stone-50 focus:bg-white transition"
              />
              <Lock className="w-4 h-4 text-stone-600 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-4 rounded-xl shadow transition duration-150 disabled:opacity-60 text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Register / Login */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-xs text-stone-600 hover:text-stone-900 font-medium transition"
          >
            {isRegistering ? (
              <>¿Ya tienes una cuenta? <span className="underline font-semibold text-stone-900">Inicia sesión</span></>
            ) : (
              <>¿No tienes una cuenta? <span className="underline font-semibold text-stone-900">Regístrate</span></>
            )}
          </button>
        </div>

        {/* Zero-knowledge disclaimer */}
        <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-center gap-2 text-xs text-stone-600">
          <Lock className="w-3.5 h-3.5" />
          <span>Privacidad sin conocimiento previo (Zero-Knowledge)</span>
        </div>
      </div>
    </div>
  );
}
