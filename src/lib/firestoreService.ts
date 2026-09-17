import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  deleteField 
} from 'firebase/firestore';
import { db, auth } from './firebase';

export async function getProfile() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const docRef = doc(db, 'user_profile_data', user.uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    payload: data.encrypted_payload,
    iv: data.iv,
    wrappedKey: data.wrappedKey,
    dekIv: data.dekIv,
    salt: data.salt
  };
}

export async function saveProfile(profile: {
  payload: string;
  iv: string;
  wrappedKey: string;
  dekIv: string;
  salt: string;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const docRef = doc(db, 'user_profile_data', user.uid);
  await setDoc(docRef, {
    encrypted_payload: profile.payload,
    iv: profile.iv,
    wrappedKey: profile.wrappedKey,
    dekIv: profile.dekIv,
    salt: profile.salt,
    updatedAt: Date.now()
  });
}

export async function getGoals() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const q = query(collection(db, 'goals'), where('uid', '==', user.uid));
  const snap = await getDocs(q);
  const goals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return goals.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function createGoal(text: string, type: string = 'grande', parentId: string | null = null) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const newGoal = {
    uid: user.uid,
    text: text.trim(),
    type,
    parentId,
    completed: false,
    createdAt: Date.now()
  };
  const docRef = await addDoc(collection(db, 'goals'), newGoal);
  return { id: docRef.id, ...newGoal };
}

export async function deleteGoal(id: string) {
  const docRef = doc(db, 'goals', id);
  await deleteDoc(docRef);
}

export async function getActivityLogs(date?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  let q = query(collection(db, 'activity_logs'), where('uid', '==', user.uid));
  if (date) {
    q = query(collection(db, 'activity_logs'), where('uid', '==', user.uid), where('date', '==', date));
  }
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addActivityLog(goalId: string, date: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const newLog = {
    uid: user.uid,
    goalId,
    date,
    timestamp: Date.now()
  };
  const docRef = await addDoc(collection(db, 'activity_logs'), newLog);
  return { id: docRef.id, ...newLog };
}

export async function deleteActivityLog(id: string) {
  const docRef = doc(db, 'activity_logs', id);
  await deleteDoc(docRef);
}

export async function getCrisisResources(country: string = 'CO') {
  const docRef = doc(db, 'crisis_resources', country);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data();
  }
  
  // Return fallback if not found
  if (country === 'CO') {
    return {
      country: 'Colombia',
      items: [
        {
          name: 'Línea 106 — Salud Mental (Minsalud)',
          phone: '106',
          availability: '24 horas, los 7 días de la semana',
          channels: 'Llamada telefónica y videollamada',
          coverage: 'Nacional'
        },
        {
          name: 'Línea 106 Bogotá — WhatsApp',
          phone: 'WhatsApp: 300 754 8933',
          availability: '24/7'
        },
        {
          name: 'Línea de emergencias',
          phone: '123',
          usage: 'Si hay riesgo inmediato para la vida, contactar directamente a emergencias.'
        }
      ]
    };
  }
  
  return {
    country: 'Internacional',
    items: [
      {
        name: 'Línea de Prevención del Suicidio Internacional',
        phone: '911 / 112',
        availability: '24/7',
        coverage: 'Global'
      }
    ]
  };
}

export async function logRiskEvent(trigger: string = 'manual') {
  const user = auth.currentUser;
  if (!user) return;
  const newEvent = {
    uid: user.uid,
    trigger,
    timestamp: Date.now()
  };
  await addDoc(collection(db, 'risk_events'), newEvent);
}

export async function requestDeletion() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const docRef = doc(db, 'users', user.uid);
  const scheduledFor = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days
  await setDoc(docRef, {
    status: 'pending_deletion',
    deletionScheduledFor: scheduledFor
  }, { merge: true });
}

export async function cancelDeletion() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const docRef = doc(db, 'users', user.uid);
  await updateDoc(docRef, {
    status: 'active',
    deletionScheduledFor: deleteField()
  });
}

export async function getUserStatus() {
  const user = auth.currentUser;
  if (!user) return 'active';
  const docRef = doc(db, 'users', user.uid);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data().status || 'active';
  }
  return 'active';
}

export async function exportReportData(periodStart: number, periodEnd: number, userConsented: boolean) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Fetch goals
  const goals = await getGoals();

  // Fetch activity logs within range
  const logsQ = query(
    collection(db, 'activity_logs'),
    where('uid', '==', user.uid),
    where('timestamp', '>=', periodStart),
    where('timestamp', '<=', periodEnd)
  );
  const logsSnap = await getDocs(logsQ);
  const activityLogs = logsSnap.docs.map(d => d.data());

  // Fetch risk events if consented
  let riskEvents: Array<{ timestamp: number }> = [];
  if (userConsented) {
    const riskQ = query(
      collection(db, 'risk_events'),
      where('uid', '==', user.uid),
      where('timestamp', '>=', periodStart),
      where('timestamp', '<=', periodEnd)
    );
    const riskSnap = await getDocs(riskQ);
    riskEvents = riskSnap.docs.map(d => ({ timestamp: d.data().timestamp })).sort((a, b) => a.timestamp - b.timestamp);
  }

  // Append-only audit record in report_exports
  try {
    await addDoc(collection(db, 'report_exports'), {
      userId: user.uid,
      generatedAt: Date.now(),
      periodStart,
      periodEnd,
      consentedAt: userConsented ? Date.now() : null,
      format: 'pdf',
      userConsentedToRiskEvents: userConsented
    });
  } catch (e) {
    console.error('Audit write failed:', e);
  }

  return {
    goals,
    activityLogs,
    riskEvents
  };
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function setupPin(pin: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const salt = Array.from(window.crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  const pinHash = await hashPin(pin, salt);
  
  const docRef = doc(db, 'user_auth_records', user.uid);
  await setDoc(docRef, {
    pinHash,
    salt,
    attemptCount: 0,
    lastAttemptAt: null,
    createdAt: Date.now()
  }, { merge: true });
}

export async function verifyPin(pin: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const docRef = doc(db, 'user_auth_records', user.uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('User not found');
  }
  
  const authRecord = snap.data();
  const salt = authRecord.salt || '';
  
  // Rate-limiting check
  const attemptCount = authRecord.attemptCount || 0;
  const lastAttemptAt = authRecord.lastAttemptAt || 0;
  const waitTime = getWaitTime(attemptCount);
  if (waitTime > 0 && (Date.now() - lastAttemptAt < waitTime)) {
    const remainingMin = Math.ceil((waitTime - (Date.now() - lastAttemptAt)) / 60000);
    throw new Error(`Too many attempts. Wait ${remainingMin} minutes`);
  }
  
  const inputHash = await hashPin(pin, salt);
  const isValid = inputHash === authRecord.pinHash;
  
  if (!isValid) {
    await updateDoc(docRef, {
      attemptCount: attemptCount + 1,
      lastAttemptAt: Date.now()
    });
    throw new Error('Invalid PIN');
  }
  
  await updateDoc(docRef, {
    attemptCount: 0,
    lastAttemptAt: null
  });
}

export async function checkPinRecordExists(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const docRef = doc(db, 'user_auth_records', user.uid);
  const snap = await getDoc(docRef);
  return snap.exists();
}

function getWaitTime(attemptCount: number): number {
  if (attemptCount < 3) return 0;
  if (attemptCount === 3) return 30 * 1000;
  if (attemptCount === 4) return 60 * 1000;
  if (attemptCount === 5) return 5 * 60 * 1000;
  return 15 * 60 * 1000;
}
