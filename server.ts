



import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeApp, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore, FieldValue, Query, WriteResult } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Resend } from 'resend';
import { GoogleGenAI, Type } from '@google/genai';

// Lazy initialization for Firebase Admin
let adminApp: App | null = null;
function getFirebaseAdmin() {
  if (!adminApp) {
    adminApp = initializeApp({
      credential: applicationDefault(),
    });
  }
  return {
    firestore: () => getFirestore(adminApp!),
    auth: () => getAuth(adminApp!),
  };
}

// Lazy initialization for Resend
let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper: Calculate wait time for exponential backoff (ms)
const getWaitTime = (attempts: number) => {
  if (attempts < 5) return 0;
  // 1 min, 5 min, 30 min, 1h, 24h...
  const intervals = [60000, 300000, 1800000, 3600000, 86400000];
  const idx = Math.min(attempts - 5, intervals.length - 1);
  return intervals[idx];
};

// API route: Verify PIN
app.post('/api/verify-pin', async (req, res) => {
  try {
    const { uid: sessionUid, status } = await getAuthenticatedUser(req);
    if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });
    if (status === 'pending_deletion') return res.status(403).json({ error: 'Account is pending deletion and locked.' });

    const { uid, pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'Missing pin' });
    if (uid && uid !== sessionUid) {
      return res.status(403).json({ error: 'Forbidden: Cannot verify PIN for another user' });
    }

    const db = getFirebaseAdmin().firestore();
    const authRef = db.collection('user_auth_records').doc(sessionUid);

    await db.runTransaction(async (transaction) => {
      const authDoc = await transaction.get(authRef);
      if (!authDoc.exists) throw new Error('User not found');
      
      const authRecord = authDoc.data()!;
      
      // 1. Rate-limiting check
      const waitTime = getWaitTime(authRecord.attemptCount || 0);
      if (waitTime > 0 && (Date.now() - (authRecord.lastAttemptAt || 0) < waitTime)) {
        throw new Error(`Too many attempts. Wait ${Math.ceil((waitTime - (Date.now() - (authRecord.lastAttemptAt || 0))) / 60000)} minutes`);
      }

      // 2. bcrypt comparison
      const isValid = await bcrypt.compare(pin, authRecord.pinHash);

      if (!isValid) {
        transaction.update(authRef, {
          attemptCount: (authRecord.attemptCount || 0) + 1,
          lastAttemptAt: Date.now()
        });
        throw new Error('Invalid PIN');
      }

      // 3. Success: Reset attempt count
      transaction.update(authRef, { attemptCount: 0, lastAttemptAt: null });
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// API route: Setup PIN for new registration
app.post('/api/setup-pin', async (req, res) => {
  try {
    const { uid: sessionUid } = await getAuthenticatedUser(req);
    if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });

    const { pin } = req.body;
    if (!pin || pin.length !== 6) {
      return res.status(400).json({ error: 'El PIN debe contener exactamente 6 dígitos.' });
    }

    const db = getFirebaseAdmin().firestore();
    const authRef = db.collection('user_auth_records').doc(sessionUid);

    const saltRounds = 10;
    const pinHash = await bcrypt.hash(pin, saltRounds);

    await authRef.set({
      pinHash,
      attemptCount: 0,
      lastAttemptAt: null,
      createdAt: Date.now()
    }, { merge: true });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error in /api/setup-pin:', err);
    res.status(500).json({ error: 'Failed to setup PIN record' });
  }
});

// API route: Prepare Reset (Step 1)
app.post('/api/prepare-reset', async (req, res) => {
  try {
    const { uid: sessionUid, status } = await getAuthenticatedUser(req);
    if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });
    if (status === 'pending_deletion') return res.status(403).json({ error: 'Account is pending deletion and locked.' });

    const { uid } = req.body;
    if (uid && uid !== sessionUid) {
      return res.status(403).json({ error: 'Forbidden: Cannot prepare reset for another user' });
    }

    const db = getFirebaseAdmin().firestore();

    // Transactional rate-limiting: max 3 requests per hour per user
    const rateLimitRef = db.collection('rate_limits').doc(`prepare_reset_${sessionUid}`);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      if (!doc.exists) {
        transaction.set(rateLimitRef, { count: 1, windowStart: now });
      } else {
        const data = doc.data()!;
        if (now - data.windowStart > oneHour) {
          transaction.set(rateLimitRef, { count: 1, windowStart: now });
        } else if (data.count >= 3) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        } else {
          transaction.update(rateLimitRef, { count: data.count + 1 });
        }
      }
    });

    // Check if user auth record exists
    const authDoc = await db.collection('user_auth_records').doc(sessionUid).get();
    if (!authDoc.exists) {
      return res.json({ 
        success: true, 
        message: 'Si la cuenta existe, se ha enviado un enlace de recuperación al correo asociado.' 
      });
    }

    // Generate cryptographically secure 256-bit recovery token
    const recoveryToken = crypto.randomBytes(32).toString('hex');
    await db.collection('pending_resets').doc(recoveryToken).set({
      uid: sessionUid,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 min
      attemptCount: 0,
      createdAt: Date.now()
    });

    // Fetch user email from Firebase Auth
    let userEmail: string | null = null;
    try {
      const userRecord = await getFirebaseAdmin().auth().getUser(sessionUid);
      userEmail = userRecord.email || null;
    } catch (authErr) {
      console.error('Error fetching user email from Firebase Auth:', authErr);
    }

    // Send email using Resend
    const resend = getResendClient();
    if (!resend) {
      console.warn('[Resend] RESEND_API_KEY no está configurada en las variables de entorno. El correo de recuperación de PIN no pudo ser enviado.');
    } else if (userEmail) {
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const resetUrl = `${appUrl}/reset-pin?token=${recoveryToken}`;

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Bienestar <onboarding@resend.dev>',
          to: userEmail,
          subject: 'Recuperación de PIN de Seguridad - Bienestar',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1c1917; line-height: 1.6; background-color: #ffffff;">
              <h2 style="color: #1c1917; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Recuperación de PIN de Seguridad</h2>
              <p style="margin-bottom: 16px; font-size: 14px; color: #44403c;">Has solicitado restablecer el PIN de seguridad de tu cuenta en la plataforma de Bienestar.</p>
              
              <!-- Zero-Knowledge Warning Notice before clicking -->
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 20px 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                <strong style="display: block; margin-bottom: 4px; color: #78350f; font-size: 14px;">⚠️ Aviso importante de privacidad (Zero-Knowledge):</strong>
                Restablecer tu PIN sin conocer el anterior generará un nuevo conjunto de claves de cifrado. Por seguridad de extremo a extremo, este proceso <strong>reiniciará tu perfil de datos cifrados y no podrás recuperar tu progreso o respuestas anteriores</strong>.
              </div>

              <p style="margin-bottom: 24px; font-size: 14px; color: #44403c;">Para continuar con el restablecimiento y configurar tu nuevo PIN de 6 dígitos, haz clic en el siguiente enlace (válido durante 15 minutos):</p>
              
              <div style="margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #1c1917; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">Restablecer mi PIN</a>
              </div>
              
              <p style="font-size: 12px; color: #78716c; margin-top: 32px; border-top: 1px solid #f5f5f4; padding-top: 16px;">Si no solicitaste este cambio, puedes ignorar este mensaje con total tranquilidad. Tu cuenta y datos cifrados permanecen intactos.</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('[Resend] Error al enviar correo de recuperación:', emailErr);
      }
    }

    // Generic response without leaking token or email status
    res.json({
      success: true,
      message: 'Si la cuenta existe, se ha enviado un enlace de recuperación al correo asociado.'
    });
  } catch (err: any) {
    if (err.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Demasiadas solicitudes de recuperación. Intenta nuevamente en 1 hora.' });
    }
    console.error('Error in /api/prepare-reset:', err);
    res.status(500).json({ error: 'Error al procesar la solicitud de recuperación' });
  }
});


// API route: Save User Profile
app.post('/api/save-profile', async (req, res) => {
  try {
    const { uid: sessionUid, status } = await getAuthenticatedUser(req);
    if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });
    if (status === 'pending_deletion') return res.status(403).json({ error: 'Account is pending deletion and locked.' });

    const { uid, payload, iv, wrappedKey, dekIv, salt } = req.body;
    if (!payload || !iv || !wrappedKey || !dekIv || !salt) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // If client supplied a uid in body, strictly ensure it matches sessionUid
    if (uid && uid !== sessionUid) {
      return res.status(403).json({ error: 'Forbidden: Cannot write profile for another user' });
    }

    const db = getFirebaseAdmin().firestore();

    // Transactional Rate Limiting (max 10 profile writes per hour per user)
    const rateLimitRef = db.collection('rate_limits').doc(`save_profile_${sessionUid}`);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      if (!doc.exists) {
        transaction.set(rateLimitRef, { count: 1, windowStart: now });
      } else {
        const data = doc.data()!;
        if (now - data.windowStart > oneHour) {
          transaction.set(rateLimitRef, { count: 1, windowStart: now });
        } else if (data.count >= 10) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        } else {
          transaction.update(rateLimitRef, { count: data.count + 1 });
        }
      }
    });

    // Write strictly to the verified sessionUid document
    await db.collection('user_profile_data').doc(sessionUid).set({
      encrypted_payload: payload,
      iv,
      wrappedKey,
      dekIv,
      salt,
      updatedAt: Date.now()
    });

    res.json({ success: true });
  } catch (err: any) {
    if (err.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Demasiadas actualizaciones de perfil. Por favor, intenta de nuevo más tarde.' });
    }
    console.error('Error saving profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// API route: Get User Profile
app.get('/api/get-profile', async (req, res) => {
  const { uid: sessionUid, status } = await getAuthenticatedUser(req);
  if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });
  if (status === 'pending_deletion') return res.status(403).json({ error: 'Account is pending deletion and locked.' });

  const requestedUid = req.query.uid as string;
  if (!requestedUid) return res.status(400).json({ error: 'Missing uid' });
  
  if (sessionUid !== requestedUid) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  const db = getFirebaseAdmin().firestore();
  
  // Transactional Rate Limiting (max 60 profile reads per hour per user)
  const rateLimitRef = db.collection('rate_limits').doc(`get_profile_${sessionUid}`);
  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      if (!doc.exists) {
        transaction.set(rateLimitRef, { count: 1, windowStart: now });
      } else {
        const data = doc.data()!;
        if (now - data.windowStart > oneHour) {
          transaction.set(rateLimitRef, { count: 1, windowStart: now });
        } else if (data.count >= 60) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        } else {
          transaction.update(rateLimitRef, { count: data.count + 1 });
        }
      }
    });
  } catch (err: any) {
    if (err.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Demasiadas solicitudes de lectura de perfil. Por favor, intenta de nuevo más tarde.' });
    }
    console.error('Rate limiting error in /api/get-profile:', err);
    return res.status(500).json({ error: 'Error al verificar límite de solicitudes de perfil.' });
  }

  try {
    const doc = await db.collection('user_profile_data').doc(requestedUid).get();
    if (!doc.exists) return res.status(404).json({ error: 'Profile not found' });
    res.json(doc.data());
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * API route: Execute Reset (Step 2)
 * 
 * DECISIÓN DE DISEÑO DE SEGURIDAD (Deliberada):
 * Este flujo de restablecimiento se basa en el modelo estándar de la industria (e.g. Google, GitHub):
 * 1. Posesión exclusiva de un recoveryToken criptográficamente seguro (256 bits, CSPRNG).
 * 2. Entrega fuera de banda al correo electrónico verificado del usuario (vía Resend, nunca expuesto en HTTP).
 * 3. Ventana estricta de caducidad de 15 minutos (expiresAt).
 * 4. Token de un solo uso (single-use): se elimina atómicamente al completarse con éxito.
 * 5. Límite de 3 intentos fallidos (attemptCount): el token se destruye si se cometen errores reiterados.
 * 
 * No se realiza un binding check criptográfico del contenido previo en el backend porque el nuevo PIN 
 * y las nuevas claves de cifrado son elegidos por el usuario en el cliente (ResetPinScreen) de forma 
 * asíncrona y posterior a la generación del token de recuperación.
 */
app.post('/api/execute-reset', async (req, res) => {
  const { recoveryToken, newPinHash, newSalt, newWrappedKey, newDekIv, newEncryptedDEK, uid } = req.body;
  if (!recoveryToken || !newPinHash) 
    return res.status(400).json({ error: 'Missing parameters' });

  const db = getFirebaseAdmin().firestore();
  const resetRef = db.collection('pending_resets').doc(recoveryToken);

  try {
    await db.runTransaction(async (transaction) => {
      const resetDoc = await transaction.get(resetRef);
      if (!resetDoc.exists) throw new Error('Token inválido o expirado');
      
      const resetData = resetDoc.data()!;
      const targetUid = resetData.uid;

      if (!targetUid || resetData.expiresAt < Date.now()) {
        transaction.delete(resetRef);
        throw new Error('Token inválido o expirado');
      }

      // Mitigación anti-DoS: si el body incluye un uid que no coincide 
      // con el targetUid vinculado al token, rechazamos sin consumir 
      // attemptCount, evitando que un atacante SIN el token agote el 
      // límite de intentos de la víctima probando uids al azar.
      // IMPORTANTE: esto NO es una defensa contra suplantación — quien 
      // ya posee el recoveryToken válido puede omitir uid o enviarlo 
      // correcto y este chequeo no lo detiene. La única garantía real de 
      // identidad en este flujo es la posesión del token de un solo uso, 
      // enviado exclusivamente al correo verificado del dueño de la 
      // cuenta (ver decisión de diseño documentada arriba del handler).
      if (uid && uid !== targetUid) {
        // Do NOT consume the attempt count or delete the token, as this protects the legitimate user from 
        // Denial of Service (DoS) attacks where an attacker guesses token values combined with random/wrong UIDs.
        throw new Error('MismatchedUID');
      }

      // 1. Rate-limiting check for token attempts
      const currentAttempts = resetData.attemptCount || 0;
      if (currentAttempts >= 3) {
        transaction.delete(resetRef);
        throw new Error('Demasiados intentos fallidos. Solicita un nuevo enlace de recuperación.');
      }

      // 2. Extract and sanitize cryptographic components
      let finalSalt = newSalt || '';
      let finalWrappedKey = newWrappedKey || '';
      let finalDekIv = newDekIv || '';

      if ((!finalSalt || !finalWrappedKey) && newEncryptedDEK) {
        try {
          const parsed = typeof newEncryptedDEK === 'string' ? JSON.parse(newEncryptedDEK) : newEncryptedDEK;
          finalSalt = parsed.salt || finalSalt;
          finalWrappedKey = parsed.wrappedKey || finalWrappedKey;
          finalDekIv = parsed.dekIv || finalDekIv;
        } catch (e) {
          // Ignore JSON parse errors if fields were provided directly
        }
      }

      // Ensure required cryptographic parameters are present
      if (!finalSalt || !finalWrappedKey) {
        const nextAttempts = currentAttempts + 1;
        if (nextAttempts >= 3) {
          transaction.delete(resetRef);
        } else {
          transaction.update(resetRef, { attemptCount: nextAttempts });
        }
        throw new Error('Parámetros criptográficos incompletos.');
      }

      // 3. Execute Reset atomically:
      // - Delete single-use recovery token
      // - Update user_auth_records with new PIN hash and clear lockout counters
      // - Update user_profile_data: set new salt, new wrappedKey, new dekIv, clear old encrypted_payload, and set requiresOnboarding: true
      const authRef = db.collection('user_auth_records').doc(targetUid);
      const dataRef = db.collection('user_profile_data').doc(targetUid);

      transaction.delete(resetRef);
      transaction.set(authRef, { 
        pinHash: newPinHash, 
        attemptCount: 0, 
        lastAttemptAt: null,
        updatedAt: Date.now() 
      }, { merge: true });

      transaction.set(dataRef, { 
        salt: finalSalt,
        wrappedKey: finalWrappedKey,
        dekIv: finalDekIv,
        encrypted_payload: null,
        requiresOnboarding: true,
        profile_reset_at: Date.now(),
        updatedAt: Date.now() 
      }, { merge: true });
    });

    res.json({ success: true });
  } catch (err: any) {
    if (err.message === 'MismatchedUID') {
      return res.status(403).json({ error: 'Acceso denegado: Identificador de usuario no coincide.' });
    }
    res.status(401).json({ error: err.message });
  }
});





// API route: AI Chat
app.post('/api/chat', async (req, res) => {
  const { uid: sessionUid, status } = await getAuthenticatedUser(req);
  if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });
  if (status === 'pending_deletion') return res.status(403).json({ error: 'Account is pending deletion and locked.' });

  const db = getFirebaseAdmin().firestore();
  
  // Rate limiting backed by Firestore (100 per hour)
  const rateLimitRef = db.collection('rate_limits').doc(`chat_${sessionUid}`);
  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      if (!doc.exists) {
        transaction.set(rateLimitRef, { count: 1, windowStart: now });
      } else {
        const data = doc.data()!;
        if (now - data.windowStart > oneHour) {
          transaction.set(rateLimitRef, { count: 1, windowStart: now });
        } else if (data.count >= 100) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        } else {
          transaction.update(rateLimitRef, { count: data.count + 1 });
        }
      }
    });
  } catch (err: any) {
    if (err.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Demasiados mensajes enviados. Por favor, intenta de nuevo más tarde.' });
    }
    console.error('Rate limiting error in /api/chat:', err);
    try {
      await db.collection('system_errors').add({
        type: 'chat_rate_limit_error',
        timestamp: Date.now(),
        errorMsg: err.message || 'Unknown error',
        userId: sessionUid
      });
    } catch (logErr) {
      console.error('Failed to log system error in /api/chat rate limit:', logErr);
    }
    return res.status(500).json({ error: 'Error al procesar la verificación de límites. Por favor, intenta de nuevo más tarde.' });
  }

  const { message, history, context } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message parameter' });

  try {
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const systemInstruction = `Eres un asistente virtual especializado en bienestar emocional, desarrollo personal y apoyo motivacional. Tu propósito es ofrecer contención empática, psicoeducación general y estrategias prácticas basadas en evidencia.

Recibirás como contexto el perfil motivacional del usuario y el estado actual de sus metas. Debes usar esta información para personalizar tus respuestas, adaptar tu tono y sugerir pasos accionables.

**REGLA 1: LÍMITES CLÍNICOS ESTRICTOS (CERO DIAGNÓSTICOS)**
- BAJO NINGUNA CIRCUNSTANCIA debes diagnosticar, nombrar, sugerir, insinuar o confirmar un trastorno mental, condición clínica o psicopatología. ESTE LÍMITE ES ABSOLUTO E INQUEBRANTABLE.
- Si el usuario te pide un diagnóstico, aclara amablemente que eres una herramienta de apoyo y no un profesional médico. NUNCA uses terminología clínica.

**REGLA 2: PROTOCOLO DE DETECCIÓN DE RIESGO Y EMERGENCIA (risk_flag)**
Marca risk_flag: true si el mensaje del usuario, en su sentido general (no palabra por palabra), corresponde a alguna de estas categorías. Ante la duda, marca true — es preferible un falso positivo que un falso negativo.

CATEGORÍA A — Ideación suicida directa: Deseo de morir, quitarse la vida, dejar de existir.
CATEGORÍA B — Desesperanza extrema: Nada va a mejorar, no hay salida, callejón sin salida.
CATEGORÍA C — Plan o medios: Método, momento, o acceso a medios para hacerse daño (prioridad máxima).
CATEGORÍA D — Autolesión: Haberse hecho daño o deseo de hacerlo.
CATEGORÍA E — Despedida o cierre: Querer "despedirse", dejar cosas en orden.
CATEGORÍA F — Carga insostenible: Sentirse una carga, "todos estarían mejor sin mí", aislamiento extremo.
CATEGORÍA G — Cambio abrupto hacia calma: Tras angustia intensa pasa a calma repentina.

LÍMITE EXPLÍCITO: NO diagnostiques. Si activas risk_flag: true, tu única función es:
1) Responder con validación breve y cálida, sin minimizar.
2) NO continuar la conversación normal en ese turno.
Tu respuesta (en el campo text) debe ser EXCLUSIVAMENTE:
"Siento mucho que estés pasando por un momento tan difícil. Tu seguridad es lo más importante en este momento y quiero que sepas que no estás solo/a. Por favor, revisa los recursos de apoyo en pantalla."

**REGLA 3: TONO, ESTILO Y REFUERZO POSITIVO**
- Tu tono debe ser cálido, validante, neutral y no punitivo. Fomenta la autonomía.

Contexto del usuario:
${context || 'No hay contexto adicional.'}`;

    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const contents = [
      ...formattedHistory,
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "La respuesta conversacional para el usuario." },
            risk_flag: { type: Type.BOOLEAN, description: "True si se detecta riesgo según las categorías A-G." }
          },
          required: ["text", "risk_flag"]
        }
      }
    });

    try {
      const output = JSON.parse(response.text || '{}');
      if (typeof output.risk_flag !== 'boolean') output.risk_flag = false;
      res.json(output);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON:', parseErr);
      await db.collection('system_errors').add({
        type: 'gemini_json_parse_error',
        timestamp: Date.now(),
        rawResponse: response.text,
        userId: sessionUid
      });
      res.json({ text: "Lo siento, estoy teniendo un problema técnico para procesar tu mensaje. Por favor, intenta de nuevo. Si necesitas ayuda inmediata o estás pasando por una crisis, por favor utiliza el botón de asistencia y recursos de emergencia (icono de salvavidas) visible en la parte superior de la interfaz.", risk_flag: false });
    }
  } catch (err: any) {
    console.error('Chat error:', err);
    try {
      await db.collection('system_errors').add({
        type: 'gemini_api_error',
        timestamp: Date.now(),
        errorMsg: err.message || 'Unknown error',
        userId: sessionUid
      });
    } catch (dbErr) {
      console.error('Failed to log system error:', dbErr);
    }
    res.json({ text: "Lo siento, estoy teniendo un problema técnico en este momento. Por favor, intenta de nuevo más tarde. Si necesitas ayuda inmediata o estás pasando por una crisis, por favor utiliza el botón de asistencia y recursos de emergencia (icono de salvavidas) visible en la parte superior de la interfaz.", risk_flag: false });
  }
});

// Helper for JWT authentication and status check
async function getAuthenticatedUser(req: any): Promise<{ uid: string | null, status: string | null, isAdmin: boolean }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { uid: null, status: null, isAdmin: false };
  const idToken = authHeader.split('Bearer ')[1];
  
  let uid: string | null = null;
  let isAdmin = false;
  
  try {
    const decodedToken = await getFirebaseAdmin().auth().verifyIdToken(idToken);
    uid = decodedToken.uid;
    isAdmin = !!decodedToken.admin;
  } catch (e) {
    return { uid: null, status: null, isAdmin: false };
  }

  // Check user status in Firestore
  if (uid) {
    const db = getFirebaseAdmin().firestore();
    const userDoc = await db.collection('users').doc(uid).get();
    const status = userDoc.exists ? userDoc.data()?.status : 'active';
    return { uid, status, isAdmin };
  }
  
  return { uid: null, status: null, isAdmin: false };
}

// Check if user is Superadmin
async function isSuperadmin(req: any): Promise<boolean> {
  const { isAdmin } = await getAuthenticatedUser(req);
  return isAdmin;
}

// API route: Request Account Deletion (Self)
app.post('/api/user/request-deletion', async (req, res) => {
  const { uid: sessionUid } = await getAuthenticatedUser(req);
  if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = getFirebaseAdmin().firestore();
    const scheduledFor = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days

    await db.collection('users').doc(sessionUid).set({
      status: 'pending_deletion',
      deletionScheduledFor: scheduledFor
    }, { merge: true });

    await db.collection('audit_logs').add({
      action: 'deletion_requested',
      targetUserId: sessionUid,
      requestedBy: 'self',
      timestamp: Date.now()
    });

    res.json({ success: true, message: 'Account scheduled for deletion in 14 days.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/cancel-deletion', async (req, res) => {
  const { uid: sessionUid } = await getAuthenticatedUser(req);
  if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = getFirebaseAdmin().firestore();

    await db.collection('users').doc(sessionUid).update({
      status: 'active',
      deletionScheduledFor: FieldValue.delete()
    });

    await db.collection('audit_logs').add({
      action: 'deletion_cancelled',
      targetUserId: sessionUid,
      requestedBy: 'self',
      timestamp: Date.now()
    });

    res.json({ success: true, message: 'Account deletion cancelled. Welcome back.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API route: Request Account Deletion (Admin)
app.post('/api/admin/request-deletion', async (req, res) => {
  const { uid: adminUid, isAdmin } = await getAuthenticatedUser(req);
  if (!adminUid) return res.status(401).json({ error: 'Unauthorized' });
  
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Superadmin access required' });
  }

  const { targetUid, reason } = req.body;
  if (!targetUid || !reason || reason.trim().length === 0) {
    return res.status(400).json({ error: 'Missing targetUid or mandatory reason' });
  }

  try {
    const db = getFirebaseAdmin().firestore();
    const scheduledFor = Date.now() + 14 * 24 * 60 * 60 * 1000;

    await db.collection('users').doc(targetUid).set({
      status: 'pending_deletion',
      deletionScheduledFor: scheduledFor
    }, { merge: true });

    await db.collection('audit_logs').add({
      action: 'deletion_requested_by_admin',
      targetUserId: targetUid,
      requestedBy: adminUid,
      reason: reason.trim(),
      timestamp: Date.now()
    });

    res.json({ success: true, message: `User ${targetUid} scheduled for deletion.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API route: Internal Cron Job - Process Scheduled Deletions
// In production, this should be invoked by Cloud Scheduler, protected by service account or cron headers.
app.post('/api/internal/process-deletions', async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'dev_cron_secret_123';
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
     return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  try {
    const db = getFirebaseAdmin().firestore();
    const auth = getFirebaseAdmin().auth();
    const now = Date.now();

    const usersSnap = await db.collection('users')
      .where('status', '==', 'pending_deletion')
      .where('deletionScheduledFor', '<=', now)
      .get();

    let deletedCount = 0;

    // Helper for batch deletion > 500 items
    const deleteQueryInBatches = async (queryRef: Query) => {
      const snap = await queryRef.get();
      if (snap.empty) return;
      const batches: Promise<WriteResult[]>[] = [];
      let currentBatch = db.batch();
      let count = 0;
      snap.docs.forEach(doc => {
        currentBatch.delete(doc.ref);
        count++;
        if (count === 500) {
          batches.push(currentBatch.commit());
          currentBatch = db.batch();
          count = 0;
        }
      });
      if (count > 0) batches.push(currentBatch.commit());
      await Promise.all(batches);
    };

    for (const userDoc of usersSnap.docs) {
      const targetUid = userDoc.id;

      // We do independent batching to avoid exceeding 500 across all operations
      await deleteQueryInBatches(db.collection('goals').where('uid', '==', targetUid));
      await deleteQueryInBatches(db.collection('activity_logs').where('uid', '==', targetUid));
      
      const userBatch = db.batch();
      userBatch.delete(userDoc.ref);
      userBatch.delete(db.collection('user_profile_data').doc(targetUid));
      await userBatch.commit();

      try {
        await auth.deleteUser(targetUid);
      } catch (e: any) {
        console.log(`Notice: Could not delete auth user ${targetUid}: ${e.message}`);
      }

      await db.collection('audit_logs').add({
        action: 'account_permanently_deleted',
        targetUserId: targetUid,
        requestedBy: 'system_cron',
        timestamp: Date.now()
      });

      deletedCount++;
    }

    res.json({ success: true, deletedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API route: Get User Goals
app.get('/api/goals', async (req, res) => {
  const { uid: sessionUid, status } = await getAuthenticatedUser(req);
  if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });
  if (status === 'pending_deletion') return res.status(403).json({ error: 'Account is pending deletion and locked.' });

  try {
    const db = getFirebaseAdmin().firestore();
    const snap = await db.collection('goals').where('uid', '==', sessionUid).get();
    const goals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    goals.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
    res.json({ goals });
  } catch (err: any) {
    console.error('Error fetching goals:', err);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// API route: Create User Goal
app.post('/api/goals', async (req, res) => {
  const { uid: sessionUid, status } = await getAuthenticatedUser(req);
  if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });
  if (status === 'pending_deletion') return res.status(403).json({ error: 'Account is pending deletion and locked.' });

  const { text, type, parentId } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing or invalid goal text' });
  }

  try {
    const db = getFirebaseAdmin().firestore();
    const newGoal = {
      uid: sessionUid,
      text: text.trim(),
      type: type || 'grande',
      parentId: parentId || null,
      completed: false,
      createdAt: Date.now()
    };
    const docRef = await db.collection('goals').add(newGoal);
    res.json({ id: docRef.id, ...newGoal });
  } catch (err: any) {
    console.error('Error creating goal:', err);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// API route: Get Activity Logs
app.get('/api/activity-logs', async (req, res) => {
  const { uid: sessionUid, status } = await getAuthenticatedUser(req);
  if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });
  if (status === 'pending_deletion') return res.status(403).json({ error: 'Account is pending deletion and locked.' });

  try {
    const db = getFirebaseAdmin().firestore();
    let queryRef: FirebaseFirestore.Query = db.collection('activity_logs').where('uid', '==', sessionUid);

    const { date, startDate, endDate } = req.query;
    if (date && typeof date === 'string') {
      queryRef = queryRef.where('date', '==', date);
    } else if (startDate && endDate) {
      queryRef = queryRef.where('date', '>=', startDate).where('date', '<=', endDate);
    }

    const snap = await queryRef.get();
    const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ logs });
  } catch (err: any) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// API route: Add Activity Log
app.post('/api/activity-logs', async (req, res) => {
  const { uid: sessionUid, status } = await getAuthenticatedUser(req);
  if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });
  if (status === 'pending_deletion') return res.status(403).json({ error: 'Account is pending deletion and locked.' });

  const { goalId, date } = req.body;
  if (!goalId || !date) {
    return res.status(400).json({ error: 'Missing goalId or date' });
  }

  try {
    const db = getFirebaseAdmin().firestore();
    const newLog = {
      uid: sessionUid,
      goalId,
      date,
      timestamp: Date.now()
    };
    const docRef = await db.collection('activity_logs').add(newLog);
    res.json({ id: docRef.id, ...newLog });
  } catch (err: any) {
    console.error('Error adding activity log:', err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// API route: Delete Activity Log
app.delete('/api/activity-logs/:id', async (req, res) => {
  const { uid: sessionUid, status } = await getAuthenticatedUser(req);
  if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });
  if (status === 'pending_deletion') return res.status(403).json({ error: 'Account is pending deletion and locked.' });

  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing log id' });

  try {
    const db = getFirebaseAdmin().firestore();
    const docRef = db.collection('activity_logs').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Log not found' });
    }

    if (docSnap.data()?.uid !== sessionUid) {
      return res.status(403).json({ error: 'Forbidden: Cannot delete other user logs' });
    }

    await docRef.delete();
    res.json({ success: true, message: 'Log deleted' });
  } catch (err: any) {
    console.error('Error deleting activity log:', err);
    res.status(500).json({ error: 'Failed to delete log' });
  }
});

// API route: Admin - List users
app.get('/api/admin/users', async (req, res) => {
  const { uid: adminUid, isAdmin } = await getAuthenticatedUser(req);
  if (!adminUid) return res.status(401).json({ error: 'Unauthorized' });
  if (!isAdmin) return res.status(403).json({ error: 'Forbidden: Superadmin access required' });

  try {
    const db = getFirebaseAdmin().firestore();
    const limitVal = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const startAfterId = req.query.startAfter as string;

    let queryRef = db.collection('users').orderBy('__name__').limit(limitVal + 1);

    if (startAfterId) {
      const startDoc = await db.collection('users').doc(startAfterId).get();
      if (startDoc.exists) {
        queryRef = queryRef.startAfter(startDoc);
      }
    }

    const snap = await queryRef.get();
    
    let hasMore = false;
    let docs = snap.docs;
    if (docs.length > limitVal) {
      hasMore = true;
      docs = docs.slice(0, limitVal);
    }

    const users = docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || null,
        displayName: data.displayName || null,
        status: data.status || 'active',
        createdAt: data.createdAt || null,
        deletionScheduledFor: data.deletionScheduledFor || null
      };
    });

    res.json({ users, hasMore });
  } catch (err: any) {
    console.error('Error fetching users for admin:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// API route: Admin - Aggregate Risk Metrics
app.get('/api/admin/risk-metrics', async (req, res) => {
  const { uid: adminUid, isAdmin } = await getAuthenticatedUser(req);
  if (!adminUid) return res.status(401).json({ error: 'Unauthorized' });
  if (!isAdmin) return res.status(403).json({ error: 'Forbidden: Superadmin access required' });

  try {
    const db = getFirebaseAdmin().firestore();
    const snap = await db.collection('risk_events').get();
    let auto = 0;
    let manual = 0;
    snap.forEach(doc => {
      const trigger = doc.data().trigger;
      if (trigger === 'auto_detected') auto++;
      if (trigger === 'manual') manual++;
    });
    res.json({ total: snap.size, auto, manual });
  } catch (err: any) {
    console.error('Error fetching risk metrics:', err);
    res.status(500).json({ error: 'Failed to fetch risk metrics' });
  }
});

// API route: Get Crisis Resources
app.get('/api/crisis-resources', async (req, res) => {
  try {
    const { uid: sessionUid } = await getAuthenticatedUser(req);
    if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });

    const db = getFirebaseAdmin().firestore();
    const country = req.query.country || 'CO';
    
    const countryDoc = await db.collection('crisis_resources').doc(country.toString()).get();
    const intlDoc = await db.collection('crisis_resources').doc('INT').get();
    
    let localResources = null;
    let intlResources = null;

    if (countryDoc.exists) {
      localResources = countryDoc.data();
    } else {
      if (country === 'CO') {
        localResources = {
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
        // Use create to avoid race conditions (throws if doc already exists)
        db.collection('crisis_resources').doc('CO').create(localResources).catch(() => {});
      }
    }

    if (intlDoc.exists) {
      intlResources = intlDoc.data();
    } else {
      intlResources = {
        country: 'Internacional',        
        items: [
          {
            name: 'Befrienders Worldwide',
            url: 'https://www.befrienders.org/',
            usage: 'Red internacional de líneas de escucha en crisis.'
          },
          {
            name: 'IASP (International Association for Suicide Prevention)',
            url: 'https://www.iasp.info/resources/Crisis_Centres/',
            usage: 'Recursos y centros de crisis organizados por país.'
          }
        ]
      };
      db.collection('crisis_resources').doc('INT').create(intlResources).catch(() => {});
    }

    res.json({ local: localResources, international: intlResources });
  } catch (err: any) {
    console.error('Error fetching crisis resources:', err);
    res.status(500).json({ error: 'Failed to fetch crisis resources' });
  }
});


// API route: Log Risk Event
app.post('/api/internal/log-risk-event', async (req, res) => {
  try {
    const { uid: sessionUid } = await getAuthenticatedUser(req);
    if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });

    const { userId, trigger, timestamp } = req.body;
    if (!trigger) return res.status(400).json({ error: 'Missing parameters' });
    
    // Ensure the user can only log for themselves
    if (userId && userId !== sessionUid) return res.status(403).json({ error: 'Forbidden' });
    
    const db = getFirebaseAdmin().firestore();
    
    // Simple Rate Limit for log-risk-event (e.g., max 10 per hour per user)
    const rateLimitRef = db.collection('rate_limits').doc(`risk_event_${sessionUid}`);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      if (!doc.exists) {
        transaction.set(rateLimitRef, { count: 1, windowStart: now });
      } else {
        const data = doc.data()!;
        if (now - data.windowStart > oneHour) {
          transaction.set(rateLimitRef, { count: 1, windowStart: now });
        } else if (data.count >= 10) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        } else {
          transaction.update(rateLimitRef, { count: data.count + 1 });
        }
      }
    });

    await db.collection('risk_events').add({
      userId: sessionUid,
      trigger,
      timestamp: timestamp || Date.now()
    });
    
    res.json({ success: true });
  } catch (err: any) {
    if (err.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Demasiados eventos registrados. Por favor, intenta más tarde.' });
    }
    console.error('Error logging risk event:', err);
    res.status(500).json({ error: 'Failed to log event' });
  }
});


// API route: Export Report Telemetry Data (Client-side PDF generation)
app.post('/api/export-report-data', async (req, res) => {
  try {
    const { uid: sessionUid } = await getAuthenticatedUser(req);
    if (!sessionUid) return res.status(401).json({ error: 'Unauthorized' });

    const { periodStart, periodEnd, userConsentedToRiskEvents, includesRiskEvents } = req.body;
    if (!periodStart || !periodEnd) return res.status(400).json({ error: 'Missing date range' });

    const userConsented = Boolean(userConsentedToRiskEvents ?? includesRiskEvents);
    const db = getFirebaseAdmin().firestore();

    // Fetch goals
    const goalsSnap = await db.collection('goals').where('uid', '==', sessionUid).get();
    const goals = goalsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fetch activity logs within range
    const logsSnap = await db.collection('activity_logs')
      .where('uid', '==', sessionUid)
      .where('timestamp', '>=', periodStart)
      .where('timestamp', '<=', periodEnd)
      .get();
    
    const activityLogs = logsSnap.docs.map(d => d.data());

    // Fetch risk events if consented (dates only)
    let riskEvents: Array<{ timestamp: number }> = [];
    if (userConsented) {
      const riskSnap = await db.collection('risk_events')
        .where('userId', '==', sessionUid)
        .where('timestamp', '>=', periodStart)
        .where('timestamp', '<=', periodEnd)
        .get();
      riskEvents = riskSnap.docs.map(d => ({ timestamp: d.data().timestamp })).sort((a, b) => a.timestamp - b.timestamp);
    }

    // Append-only audit record in report_exports
    await db.collection('report_exports').add({
      userId: sessionUid,
      generatedAt: Date.now(),
      periodStart,
      periodEnd,
      consentedAt: userConsented ? Date.now() : null,
      format: 'pdf',
      userConsentedToRiskEvents: userConsented
    });

    res.json({
      success: true,
      goals,
      activityLogs,
      riskEvents
    });
  } catch (err: any) {
    console.error('Error fetching export report data:', err);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
