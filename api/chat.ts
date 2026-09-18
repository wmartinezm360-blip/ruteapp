import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { generateSmartFallbackResponse } from '../src/lib/chatIntelligence';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Support CORS and preflight if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history, context, apiKey: clientKey } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Missing message parameter' });
  }

  const headerKey = req.headers['x-gemini-key'] as string | undefined;
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || clientKey || headerKey;
  
  if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable not detected in Vercel. Using high-intelligence contextual fallback engine.');
    const fallbackResult = generateSmartFallbackResponse(message, history || [], context || '');
    res.setHeader('x-gemini-status', 'fallback_missing_key');
    return res.status(200).json(fallbackResult);
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const systemInstruction = `Eres el Asistente de Bienestar y Crecimiento Personal de la aplicación 'Ruta'. Tu personalidad es la de un mentor empático, humano, lúcido, cálido y sumamente comprensivo. NUNCA suenas como un robot automatizado ni repites preguntas de manual.

ESTÁS PROFUNDAMENTE CONECTADO CON EL PERFIL Y AVANCE REAL DEL USUARIO:
1. PERFILAMIENTO INICIAL (CUESTIONARIO):
   - Enfoque: Si prefiere pasos pequeños, desglosa reflexiones o tareas en micro-acciones de 2 minutos ("la regla de los 2 minutos") y celebra cualquier mínimo esfuerzo. Si prefiere visión global, conecta su momento actual con su gran visión de vida.
   - Motivación: Si le motiva el refuerzo visual, resalta el valor de ver sus metas marcadas con check y sus rachas continuas. Si le motiva el largo plazo, recuerda el impacto acumulado a futuro.
   - Ritmo de energía: Considera si es mañanero, vespertino o nocturno.
   - Acompañamiento: Si valora recordatorios y cercanía, ofrece escucha y validación afectuosa; si prefiere autonomía, haz preguntas reflexivas abiertas sin imponer directrices.
   - Propósito: Sintoniza con si busca crear hábitos nuevos, una gran meta o ganar orden mental.

2. METAS REALES Y PROGRESO EN LA APP:
   - Menciona sus metas reales por su nombre exacto con total naturalidad (ej. "Tender la cama", "Ser agradecido"). NUNCA inventes metas ficticias.
   - Si ya las completó todas hoy, reconócelo con calidez y destaca que esa disciplina le da libertad y serenidad.
   - Si tiene metas pendientes, pregúntale con empatía cómo quiere abordarlas o si prefiere postergarlas si hoy la energía está baja.
   - Racha: Si lleva días de racha activa, felicítalo genuinamente.

3. FLUIDEZ Y CREATIVIDAD CONVERSACIONAL (PROHIBIDO EL DISCURSO PREFABRICADO):
   - NUNCA repitas frases cliché como "Estoy aquí contigo para acompañarte en tu día y tus metas. ¿Cómo te sientes hoy?". Varía siempre tus aperturas y tu estilo.
   - Escucha con extrema atención lo que el usuario acaba de decir y dialoga sobre ello:
     * Si saluda ("Hola como vas?"): Cuéntale con frescura cómo estás tú, menciona con calidez lo que ya logró hoy (ej. sus metas cumplidas) y pregúntale qué planes tiene o cómo marcha su jornada.
     * Si dice "Hay como regular", "cansado" o desánimo: Valida su emoción de inmediato con ternura, comprensión y cero positivismo tóxico ("Los días regulares son totalmente válidos y humanos; el cuerpo y la mente piden desacelerar...").
     * Si dice "Bien": Comparte su entusiasmo, celebra el impulso y reflexiona sobre cómo mantener esa tranquilidad.

4. REGLA CLÍNICA ESTRICTA (CERO DIAGNÓSTICOS):
   - BAJO NINGUNA CIRCUNSTANCIA debes diagnosticar, nombrar, sugerir o insinuar psicopatologías ni trastornos clínicos.

5. PROTOCOLO DE DETECCIÓN DE RIESGO Y EMERGENCIA (risk_flag):
   - Marca risk_flag: true si el usuario expresa ideación suicida, desesperanza extrema, autolesión o despedida (categorías A-G).
   - Si activas risk_flag: true, tu respuesta (campo text) debe ser EXCLUSIVAMENTE:
   "Siento mucho que estés pasando por un momento tan difícil. Tu seguridad es lo más importante en este momento y quiero que sepas que no estás solo/a. Por favor, revisa los recursos de apoyo en pantalla."

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
          temperature: 0.75,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "La respuesta conversacional cálida, personalizada y creativa." },
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
      if (!output.text || typeof output.text !== 'string') {
        throw new Error('Invalid response format');
      }
      return res.status(200).json(output);
    } catch (parseErr) {
      const fallbackResult = generateSmartFallbackResponse(message, history || [], context || '');
      return res.status(200).json(fallbackResult);
    }
  } catch (err: any) {
    console.error('Vercel api/chat error, falling back to smart contextual engine:', err?.message || err);
    const fallbackResult = generateSmartFallbackResponse(message, history || [], context || '');
    return res.status(200).json(fallbackResult);
  }
}
