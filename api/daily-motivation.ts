import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { context, date } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      greeting: "¡Hola! Un nuevo día para avanzar a tu ritmo",
      message: "Cada paso que das cuenta. Recuerda que la constancia y la amabilidad contigo mismo son la clave de cualquier gran camino.",
      tip: "Elige una pequeña acción hoy y celébrala cuando la cumplas."
    });
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const systemInstruction = `Eres el Asistente de Bienestar de la aplicación 'Ruta'.
Tu tarea es generar un mensaje diario de motivación único, inspirador, empático y profundamente personalizado para el usuario, sin que él tenga que escribir primero.

DEBES SEGUIR ESTAS INSTRUCCIONES:
1. PERSONALIZACIÓN BASADA EN PERFIL: Utiliza el perfil motivacional del usuario (su ritmo de energía, si prefiere pasos pequeños o visión global, qué lo motiva, su estilo de acompañamiento).
2. PERSONALIZACIÓN BASADA EN METAS REALES: Menciona de forma orgánica y concreta sus metas reales actuales y su estado de hoy (si tiene metas completadas o pendientes). Si aún no tiene metas, anímalo calurosamente a dar el primer paso y definir una. NUNCA inventes metas ficticias (como hábitos de lectura u otros que no figuren en el contexto).
3. TONO: Cercano, humano, motivador y libre de clichés vacíos o frases genéricas prefabricadas.
4. LÍMITES CLÍNICOS: No uses diagnósticos, ni términos médicos.

Devuelve un JSON con exactamente:
- "greeting": saludo cálido para hoy adaptado a su ritmo y momento (ej: "¡Buenos días, enfocado en tus pasos!", "¡Buenas tardes, momento de recargar energías!").
- "message": mensaje motivador de 2 a 3 oraciones conectando con sus metas reales y su estilo personal de afrontar el día.
- "tip": una micro-estrategia práctica de 1 sola frase accionable para hoy.`;

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
              greeting: { type: Type.STRING },
              message: { type: Type.STRING },
              tip: { type: Type.STRING }
            },
            required: ["greeting", "message", "tip"]
          }
        };

        response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: `Genera la motivación para hoy (${date || 'hoy'}).\n\n${context || ''}` }] }],
          config: modelConfig
        });
        break;
      } catch (err: any) {
        attempts++;
        if (attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempts));
          continue;
        }
        throw err;
      }
    }

    const output = JSON.parse(response.text || '{}');
    return res.status(200).json(output);
  } catch (err: any) {
    console.error('Daily motivation error:', err);
    return res.status(200).json({
      greeting: "¡Hola! Un nuevo día para avanzar a tu ritmo",
      message: "Cada paso que das cuenta. Recuerda que la constancia y la amabilidad contigo mismo son la clave de cualquier gran camino.",
      tip: "Elige una pequeña acción hoy y celébrala cuando la cumplas."
    });
  }
}
