/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { generateSalt } from './lib/encryption';
import AuthScreen from './components/auth/AuthScreen';
import PinScreen from './components/auth/PinScreen';
import ResetPinScreen from './components/auth/ResetPinScreen';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import Dashboard from './components/dashboard/Dashboard';
import { Shield, Loader2 } from 'lucide-react';

export default function App() {
  const isResetPinRoute = typeof window !== 'undefined' && window.location.pathname === '/reset-pin';

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [pinVerified, setPinVerified] = useState(false);
  
  // States for new user onboarding PIN and salt generation
  const [setupPin, setSetupPin] = useState<string | null>(null);
  const [setupSalt, setSetupSalt] = useState<Uint8Array | null>(null);

  useEffect(() => {
    // If on reset-pin route, skip standard auth listener overhead
    if (isResetPinRoute) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setPinVerified(false);
      setSetupPin(null);
      setSetupSalt(null);

      if (user) {
        setCheckingProfile(true);
        try {
          // Check if encrypted profile payload exists via backend API endpoint
          const token = await user.getIdToken();
          const response = await fetch(`/api/get-profile?uid=${user.uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const profileData = await response.json();
            const exists = Boolean(profileData?.encrypted_payload) && !profileData?.requiresOnboarding;
            setHasProfile(exists);
          } else {
            setHasProfile(false);
          }
        } catch (error) {
          console.error('Error verifying user profile via API:', error);
          setHasProfile(false);
        } finally {
          setCheckingProfile(false);
        }
      } else {
        setHasProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [isResetPinRoute]);

  // 0. Standalone Reset PIN route (accessible without active Firebase session)
  if (isResetPinRoute) {
    return <ResetPinScreen />;
  }

  // 1. Initial authentication / profile verification loader
  if (authLoading || checkingProfile) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center mb-4 shadow-sm animate-pulse">
          <Shield className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-stone-600 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-stone-800" />
          <span>Iniciando entorno seguro...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state -> Display Firebase Auth (Google / Email)
  if (!currentUser) {
    return <AuthScreen />;
  }

  // 3. Authenticated State
  // Scenario A: Returning user with existing encrypted profile
  if (hasProfile) {
    if (!pinVerified) {
      return (
        <PinScreen 
          mode="verify" 
          uid={currentUser.uid}
          onSuccess={() => setPinVerified(true)} 
        />
      );
    }
    return <Dashboard />;
  }

  // Scenario B: New user requiring initial PIN setup & Onboarding Flow
  if (!setupPin || !setupSalt) {
    return (
      <PinScreen
        mode="setup"
        uid={currentUser.uid}
        onSuccess={(pin) => {
          setSetupPin(pin);
          // Generate cryptographically secure random 16-byte salt only once at registration
          setSetupSalt(generateSalt());
        }}
      />
    );
  }

  return (
    <OnboardingFlow 
      pin={setupPin} 
      salt={setupSalt} 
      uid={currentUser.uid} 
      onComplete={() => {
        setHasProfile(true);
        setPinVerified(true);
      }} 
    />
  );
}
