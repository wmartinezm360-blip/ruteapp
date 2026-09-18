/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuestionnaireAnswers {
  [questionId: string | number]: string;
}

const STORAGE_KEY_PREFIX = 'ruta_user_profile_';

export function saveDecryptedProfileToLocal(uid: string, answers: QuestionnaireAnswers): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${uid}`;
    const value = JSON.stringify(answers);
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('Failed to save decrypted profile to storage:', e);
  }
}

export function getDecryptedProfileFromLocal(uid?: string): QuestionnaireAnswers | null {
  try {
    if (uid) {
      const key = `${STORAGE_KEY_PREFIX}${uid}`;
      const sessionVal = sessionStorage.getItem(key);
      if (sessionVal) return JSON.parse(sessionVal);

      const localVal = localStorage.getItem(key);
      if (localVal) return JSON.parse(localVal);
    }

    // Fallback: search any stored profile in session/local storage
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_KEY_PREFIX)) {
          const val = localStorage.getItem(k);
          if (val) {
            try {
              return JSON.parse(val);
            } catch (_) {}
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to read profile from storage:', e);
  }
  return null;
}

export function formatProfileSummary(answers: QuestionnaireAnswers | null): string {
  if (!answers || Object.keys(answers).length === 0) {
    return 'Perfil general: Usuario enfocado en cultivar bienestar, establecer metas claras y desarrollar constancia.';
  }

  const descriptors: string[] = [];

  // Q1: Reacción ante retos
  const q1 = answers['1'] || answers[1];
  if (q1 === 'small_steps') {
    descriptors.push('Enfoque ante retos: Prefiere pasos pequeños, accionables y graduales (desglose progresivo). Valora la claridad y la calma sobre la prisa.');
  } else if (q1 === 'big_picture') {
    descriptors.push('Enfoque ante retos: Prefiere ver el panorama general y lanzarse con visión global y ambiciosa.');
  }

  // Q2: Motivación al completar tareas
  const q2 = answers['2'] || answers[2];
  if (q2 === 'visual_reinforcement') {
    descriptors.push('Fuente de motivación: Refuerzo visual inmediato, celebrar pequeños hitos y ver el progreso tangible día a día.');
  } else if (q2 === 'long_term_goal') {
    descriptors.push('Fuente de motivación: Conexión con metas a largo plazo, propósito duradero y sentido de dirección profunda.');
  }

  // Q3: Nivel de energía durante el día
  const q3 = answers['3'] || answers[3];
  if (q3 === 'morning') {
    descriptors.push('Ritmo de energía: Matutino (rinde mejor y tiene mayor claridad mental en las mañanas).');
  } else if (q3 === 'afternoon') {
    descriptors.push('Ritmo de energía: Vespertino (su mayor energía y foco se activan durante la tarde).');
  } else if (q3 === 'night') {
    descriptors.push('Ritmo de energía: Nocturno (se siente más inspirado y concentrado en las horas de la noche).');
  }

  // Q4: Supervisión / acompañamiento
  const q4 = answers['4'] || answers[4];
  if (q4 === 'constant_reminders') {
    descriptors.push('Estilo de acompañamiento: Valora recordatorios gentiles, presencia cercana, validación cálida y empatía constante.');
  } else if (q4 === 'autonomy') {
    descriptors.push('Estilo de acompañamiento: Prefiere total autonomía, espacio para autogestionarse y reflexiones estratégicas sin presión.');
  }

  // Q5: Propósito principal
  const q5 = answers['5'] || answers[5];
  if (q5 === 'build_habits') {
    descriptors.push('Propósito principal en Ruta: Construir y consolidar nuevos hábitos saludables y sostenibles.');
  } else if (q5 === 'achieve_big_goal') {
    descriptors.push('Propósito principal en Ruta: Lograr una gran meta o proyecto personal/profesional significativo.');
  } else if (q5 === 'organize_life') {
    descriptors.push('Propósito principal en Ruta: Organizar su vida, estructurar su rutina diaria y recuperar tranquilidad mental.');
  }

  return descriptors.join('\n- ');
}

export interface TodayMoodInfo {
  score: number;
  label?: string;
  energyScore?: number;
  emotions?: string[];
  triggers?: string[];
  notes?: string;
  isPersistentLowMood?: boolean;
}

export function buildMotivationalContext(options: {
  profileAnswers: QuestionnaireAnswers | null;
  goals: Array<{ id: string; text?: string; title?: string; type?: string }>;
  completedGoalIds: string[];
  streakDays?: number;
  todayMood?: TodayMoodInfo | null;
  isPersistentLowMood?: boolean;
}): string {
  const { profileAnswers, goals, completedGoalIds, streakDays = 0, todayMood, isPersistentLowMood } = options;

  const profileText = formatProfileSummary(profileAnswers);
  const now = new Date();
  const timeOfDay = now.getHours() < 12 ? 'Mañana' : now.getHours() < 18 ? 'Tarde' : 'Noche';
  const formattedDate = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  let goalsText = '';
  if (!goals || goals.length === 0) {
    goalsText = `El usuario aún no tiene metas configuradas en "Mis Metas".
Instrucción clave: Anímalo calurosamente a crear su primera meta o hábito pequeño de acuerdo con su estilo motivacional. NUNCA inventes metas que el usuario no tiene (como lectura u otras).`;
  } else {
    const totalGoals = goals.length;
    const completedCount = completedGoalIds.filter(id => goals.some(g => g.id === id)).length;
    const pendingGoals = goals.filter(g => !completedGoalIds.includes(g.id));
    const completedGoals = goals.filter(g => completedGoalIds.includes(g.id));

    goalsText = `METAS REALES REGISTRADAS POR EL USUARIO (${totalGoals} en total):
Progreso de hoy: ${completedCount} de ${totalGoals} completadas.
${completedGoals.length > 0 ? `Metas ya completadas hoy:\n${completedGoals.map(g => `  ✓ "${g.text || g.title}"`).join('\n')}` : 'Aún no ha marcado metas completadas hoy.'}
${pendingGoals.length > 0 ? `Metas pendientes para hoy:\n${pendingGoals.map(g => `  ○ "${g.text || g.title}"`).join('\n')}` : '¡Todas las metas de hoy han sido completadas!'}

Racha de días activos: ${streakDays} ${streakDays === 1 ? 'día' : 'días'}.`;
  }

  const isLow = (todayMood && todayMood.score <= 2) || isPersistentLowMood || (todayMood && todayMood.isPersistentLowMood);

  let moodText = 'El usuario no ha registrado aún su estado de ánimo hoy.';
  if (todayMood) {
    moodText = `ESTADO DE ÁNIMO REGISTRADO HOY (Escala 1 a 5):
Puntaje de ánimo: ${todayMood.score}/5 (${todayMood.label || 'registrado'})
Nivel de energía: ${todayMood.energyScore ? `${todayMood.energyScore}/5` : 'no especificado'}
${todayMood.emotions && todayMood.emotions.length > 0 ? `Emociones sentidas: ${todayMood.emotions.join(', ')}` : ''}
${todayMood.triggers && todayMood.triggers.length > 0 ? `Detonantes/Factores influyentes: ${todayMood.triggers.join(', ')}` : ''}
${todayMood.notes ? `Nota personal: "${todayMood.notes}"` : ''}
${isLow ? '>> DETECCIÓN ACTIVA: El estado de ánimo es bajo (1 o 2 sobre 5) o hay persistencia de fatiga/desánimo.' : ''}`;
  }

  let lowMoodSpecialDirectives = '';
  if (isLow) {
    lowMoodSpecialDirectives = `
🚨 PROTOCOLO ESPECIAL DE INTELIGENCIA SOCIAL Y ÁNIMO BAJO:
1. VALIDACIÓN EMPÁTICA Y NO INVALIDACIÓN: El usuario está experimentando un estado de ánimo bajo o persistente. Trátalo con máxima ternura, sin positivismo tóxico ni clichés ("¡sonríe!"). Reconoce que los días difíciles son parte de la condición humana.
2. APLICACIÓN DE INTELIGENCIA SOCIAL:
   - Desactiva el impulso de aislamiento defensivo: explícale que cuando el ánimo cae, el cerebro erróneamente cree que "somos una carga" o que "nadie nos entiende".
   - Refuerza la importancia de las micro-conexiones seguras (un mensaje breve a alguien confiable) y de poner límites saludables si el detonante es el agotamiento social o laboral.
3. REFUERZO DE CONSEJOS Y RESEÑA DE LECTURAS O VIDEOS:
   - Cuando sea oportuno o si el usuario busca orientación, reseña con criterio una lectura terapéutica de alto valor (como "Sentirse Bien" de David D. Burns para desmontar pensamientos destructivos, "Encuentra tu persona vitamina" de Marian Rojas Estapé para la neurociencia de los vínculos sanadores, o "Sé amable contigo mismo" de Kristin Neff para la autocompasión) o bien reseña una charla de YouTube (como Brené Brown sobre la vulnerabilidad y la conexión humana, o Marian Rojas Estapé sobre cómo salir del bucle del cortisol y la tristeza).
   - Explica brevemente de qué trata la lectura o video y por qué su mensaje aplica con precisión a su situación de hoy.
4. MICRO-ACCIÓN DE BAJA DEMANDA: No le exijas grandes tareas. Si tiene metas pendientes, sugiérele pausarlas o cumplir una micro-versión de 1 o 2 minutos sin culpa.`;
  }

  return `FECHA Y HORA ACTUAL:
${formattedDate}, Momento del día: ${timeOfDay}.

PERFIL MOTIVACIONAL DEL USUARIO (Proveniente de su cuestionario inicial):
- ${profileText}

ESTADO DE ÁNIMO HOY:
${moodText}

ESTADO DE SUS METAS REALES:
${goalsText}
${lowMoodSpecialDirectives}

DIRECTRICES GENERALES PARA LA RESPUESTA:
1. RESPONDE DIRECTAMENTE AL CONTEXTO REAL: Menciona sus metas reales por su nombre específico cuando sea oportuno. NUNCA menciones metas ficticias.
2. TOMA EN CUENTA SU ESTADO DE ÁNIMO: Si su ánimo está bajo (1 o 2), prioriza el protocolo de inteligencia social anterior; si está alto (4 o 5), celebra su vitalidad.
3. ADAPTA EL TONO A SU PERFIL: Si el usuario prefiere pasos pequeños, sugiérele micro-acciones; si prefiere visión global, recuérdale el propósito amplio; si es mañanero/nocturno, ten en cuenta su ritmo.
4. Si el usuario ya completó metas hoy, valida su esfuerzo; si tiene metas pendientes, ofrécele un impulso compasivo y no punitivo.`;
}
