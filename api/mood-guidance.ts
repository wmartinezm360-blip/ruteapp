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

  const { logs, todayMood, summary } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      empathicAnalysis: "Reconocer cómo te sientes es el primer paso valiente para cuidar de tu bienestar.",
      socialIntelligenceInsight: "No tienes que cargar con todo tú solo/a. Compartir tus sentimientos disminuye su peso.",
      keyAdvice: [
        {
          title: "Valida tus emociones",
          description: "Permítete sentir sin juzgarte.",
          actionableStep: "Respira profundo 3 veces."
        }
      ],
      bookRecommendation: {
        title: "El poder de la vulnerabilidad",
        author: "Brené Brown",
        review: "Un libro transformador sobre la aceptación.",
        whyItHelps: "Ayuda a soltar la autoexigencia.",
        keyExercise: "Escribe 3 cosas que agradezcas hoy."
      },
      videoRecommendation: {
        title: "El poder de la vulnerabilidad",
        speaker: "Brené Brown",
        channel: "TED",
        review: "Una charla inspiradora sobre la conexión humana.",
        youtubeSearchQuery: "Brene Brown poder de la vulnerabilidad TED",
        keyTakeaway: "La vulnerabilidad es la cuna de la empatía."
      },
      immediateAction: "Toma un vaso de agua y camina unos pasos."
    });
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const systemInstruction = `Eres el Especialista en Inteligencia Social y Acompañamiento Emocional de la aplicación 'Ruta'.
Tu propósito es analizar el estado de ánimo y los patrones de bajas anímicas persistentes del usuario y ofrecer:
1. Contención y validación empática desde la INTELIGENCIA SOCIAL (comprendiendo la relación entre tristeza, aislamiento defensivo, rumiación mental y la biología de los vínculos afectivos).
2. Refuerzo de consejos prácticos y accionables de Inteligencia Social para superar la sensación de ser una carga, restablecer micro-conexiones seguras y cuidar la batería relacional.
3. Reseña de una lectura terapéutica de alto valor aplicable a sus detonantes específicos.
4. Reseña y recomendación de un video o conferencia de YouTube relevante (de oradores reconocidos como Brené Brown, Marian Rojas Estapé, David D. Burns, Andrew Huberman o Eckhart Tolle).
5. Una micro-acción de 2 minutos para hoy.

NORMAS OBLIGATORIAS:
- INTELIGENCIA SOCIAL: Enfócate en cómo los vínculos, la autocompasión y la comunicación honesta regulan el sistema nervioso. Evita el positivismo tóxico ("¡ánimo, sonríe!"). Valida la emoción con respeto.
- LÍMITES CLÍNICOS ESTRICTOS: NUNCA diagnostiques ni etiquetes trastornos clínicos (depresión clínica, bipolaridad, patologías).
- RELEVANCIA: Conecta los consejos directamente con los detonantes reales del usuario (sueño, trabajo, relaciones, etc.).

Devuelve un JSON estructurado con:
- "empathicAnalysis": análisis cálido y lúcido del momento anímico y detonantes observados (2 a 3 oraciones).
- "socialIntelligenceInsight": reflexión profunda sobre la dinámica relacional o social del ánimo bajo persistente (ej. no aislarse, desarmar la culpa de pedir ayuda).
- "keyAdvice": lista de 3 consejos prácticos específicos con "title", "description", y "actionableStep".
- "bookRecommendation": objeto con "title", "author", "review", "whyItHelps", y "keyExercise".
- "videoRecommendation": objeto con "title", "speaker", "channel", "review", "youtubeSearchQuery", y "keyTakeaway".
- "immediateAction": una micro-acción de 2 minutos realizable hoy.`;

    const userPrompt = `Analiza los siguientes datos anímicos recientes del usuario:
- Registro de Hoy: ${JSON.stringify(todayMood || 'No registrado aún hoy')}
- Resumen de métricas y detonantes: ${JSON.stringify(summary || {})}
- Registros recientes (últimos días): ${JSON.stringify((logs || []).slice(0, 10))}

Genera el acompañamiento y recomendaciones con inteligencia social para afrontar y remontar las bajas de ánimo persistentes.`;

    let response;
    let attempts = 0;
    const maxRetries = 2;
    const delay = 800;

    while (true) {
      try {
        const modelName = attempts === 0 ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite';
        const modelConfig: any = {
          systemInstruction,
          temperature: 0.6,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              empathicAnalysis: { type: Type.STRING },
              socialIntelligenceInsight: { type: Type.STRING },
              keyAdvice: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    actionableStep: { type: Type.STRING }
                  },
                  required: ["title", "description", "actionableStep"]
                }
              },
              bookRecommendation: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  author: { type: Type.STRING },
                  review: { type: Type.STRING },
                  whyItHelps: { type: Type.STRING },
                  keyExercise: { type: Type.STRING }
                },
                required: ["title", "author", "review", "whyItHelps", "keyExercise"]
              },
              videoRecommendation: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  channel: { type: Type.STRING },
                  review: { type: Type.STRING },
                  youtubeSearchQuery: { type: Type.STRING },
                  keyTakeaway: { type: Type.STRING }
                },
                required: ["title", "speaker", "channel", "review", "youtubeSearchQuery", "keyTakeaway"]
              },
              immediateAction: { type: Type.STRING }
            },
            required: [
              "empathicAnalysis", 
              "socialIntelligenceInsight", 
              "keyAdvice", 
              "bookRecommendation", 
              "videoRecommendation", 
              "immediateAction"
            ]
          }
        };

        response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
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
    console.error('Mood guidance error:', err);
    return res.status(200).json({
      empathicAnalysis: "Reconocer cómo te sientes es el primer paso valiente para cuidar de tu bienestar.",
      socialIntelligenceInsight: "No tienes que cargar con todo tú solo/a. Compartir tus sentimientos disminuye su peso.",
      keyAdvice: [
        {
          title: "Valida tus emociones",
          description: "Permítete sentir sin juzgarte.",
          actionableStep: "Respira profundo 3 veces."
        }
      ],
      bookRecommendation: {
        title: "El poder de la vulnerabilidad",
        author: "Brené Brown",
        review: "Un libro transformador sobre la aceptación.",
        whyItHelps: "Ayuda a soltar la autoexigencia.",
        keyExercise: "Escribe 3 cosas que agradezcas hoy."
      },
      videoRecommendation: {
        title: "El poder de la vulnerabilidad",
        speaker: "Brené Brown",
        channel: "TED",
        review: "Una charla inspiradora sobre la conexión humana.",
        youtubeSearchQuery: "Brene Brown poder de la vulnerabilidad TED",
        keyTakeaway: "La vulnerabilidad es la cuna de la empatía."
      },
      immediateAction: "Toma un vaso de agua y camina unos pasos."
    });
  }
}
