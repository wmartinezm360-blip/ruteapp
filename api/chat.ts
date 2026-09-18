import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Support CORS and preflight if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history, context } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Missing message parameter' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Missing GEMINI_API_KEY environment variable in Vercel');
    return res.status(200).json({
      text: "¡Hola! Estoy aquí contigo para acompañarte en tu día y tus metas. ¿Cómo te sientes hoy?",
      risk_flag: false
    });
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const systemInstruction = `Eres un asistente virtual especializado en bienestar emocional, desarrollo personal y apoyo motivacional en la aplicación 'Ruta'. Tu propósito es ofrecer contención empática, psicoeducación general y estrategias prácticas basadas en evidencia.

Recibirás como contexto el perfil motivacional del usuario (obtenido de su cuestionario inicial) y el estado real de sus metas.
DEBES incorporar de manera directa, específica y empática este perfil y estas metas en tus respuestas. 
- PROHIBIDO DAR RESPUESTAS GENÉRICAS: Responde siempre considerando el estilo del usuario (ej. si prefiere pasos pequeños o visión global, su nivel de energía o su estilo de acompañamiento).
- METAS REALES: Menciona sus metas reales por su nombre específico. NUNCA inventes metas ficticias (como lectura, a menos que esté en sus metas reales). Si no tiene metas creadas, invítalo con calidez a registrar su primera meta en "Mis Metas".
- Si el usuario simplemente te saluda (ej: "Hola"), salúdalo cálidamente reconociendo su progreso de hoy o sus metas pendientes según su perfil motivacional.

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
- Tu tono debe ser cálido, validante, constructivo y no punitivo. Fomenta la autonomía del usuario.

Contexto real del usuario:
${context || 'No hay contexto adicional.'}`;

    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const contents = [
      ...formattedHistory,
      { role: 'user', parts: [{ text: message }] }
    ];

    let response;
    let attempts = 0;
    const maxRetries = 2;
    const delay = 800;

    while (true) {
      try {
        const modelName = attempts === 0 ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite';
        const modelConfig: any = {
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
        };

        response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: modelConfig
        });
        break;
      } catch (err: any) {
        attempts++;
        const isTransient = err.status === 503 || err.status === 429 || 
                            (err.message && (err.message.includes('503') || 
                             err.message.includes('UNAVAILABLE') || 
                             err.message.includes('high demand') || 
                             err.message.includes('temporary')));
        
        if (isTransient && attempts < maxRetries) {
          const jitter = Math.random() * 200;
          const currentDelay = delay * Math.pow(2, attempts) + jitter;
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          continue;
        }
        throw err;
      }
    }

    try {
      const output = JSON.parse(response.text || '{}');
      if (typeof output.risk_flag !== 'boolean') output.risk_flag = false;
      return res.status(200).json(output);
    } catch (parseErr) {
      return res.status(200).json({ 
        text: "¡Hola! Estoy aquí contigo para acompañarte en tu día y tus metas. ¿Cómo te sientes hoy?", 
        risk_flag: false 
      });
    }
  } catch (err: any) {
    console.error('Vercel api/chat error:', err);
    return res.status(200).json({ 
      text: "¡Hola! Estoy aquí para acompañarte con tus metas y bienestar. Cuéntame, ¿cómo va tu día?", 
      risk_flag: false 
    });
  }
}
