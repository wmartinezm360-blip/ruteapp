/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Contextual Intelligence Engine for Ruta Assistant.
 * Generates deeply empathetic, personalized, creative, and non-generic responses
 * based on user's questionnaire profiling, real goals, active streaks, and daily mood logs.
 */

export interface ParsedContext {
  profile: {
    approach?: 'small_steps' | 'big_picture' | string;
    motivation?: 'visual_reinforcement' | 'long_term_goal' | string;
    energy?: 'morning' | 'afternoon' | 'night' | string;
    accompaniment?: 'constant_reminders' | 'autonomy' | string;
    purpose?: 'build_habits' | 'achieve_big_goal' | 'organize_life' | string;
    summary: string;
  };
  goals: {
    total: number;
    completed: string[];
    pending: string[];
    all: string[];
  };
  streak: number;
  mood: {
    recorded: boolean;
    score?: number;
    label?: string;
    energyScore?: number;
    emotions: string[];
    triggers: string[];
    notes?: string;
    isLow: boolean;
  };
}

/**
 * Parses raw context text into structured parameters for contextual reasoning.
 */
export function parseContextString(contextStr: string): ParsedContext {
  const result: ParsedContext = {
    profile: { summary: '' },
    goals: { total: 0, completed: [], pending: [], all: [] },
    streak: 0,
    mood: { recorded: false, emotions: [], triggers: [], isLow: false }
  };

  if (!contextStr) return result;

  // Profile traits
  if (contextStr.includes('pasos pequeños')) result.profile.approach = 'small_steps';
  else if (contextStr.includes('panorama general')) result.profile.approach = 'big_picture';

  if (contextStr.includes('Refuerzo visual') || contextStr.includes('refuerzo visual')) result.profile.motivation = 'visual_reinforcement';
  else if (contextStr.includes('largo plazo')) result.profile.motivation = 'long_term_goal';

  if (contextStr.includes('Matutino') || contextStr.includes('mañanero')) result.profile.energy = 'morning';
  else if (contextStr.includes('Vespertino')) result.profile.energy = 'afternoon';
  else if (contextStr.includes('Nocturno')) result.profile.energy = 'night';

  if (contextStr.includes('recordatorios gentiles') || contextStr.includes('presencia cercana')) result.profile.accompaniment = 'constant_reminders';
  else if (contextStr.includes('autonomía')) result.profile.accompaniment = 'autonomy';

  if (contextStr.includes('Construir y consolidar') || contextStr.includes('hábitos nuevos')) result.profile.purpose = 'build_habits';
  else if (contextStr.includes('gran meta')) result.profile.purpose = 'achieve_big_goal';
  else if (contextStr.includes('Organizar su vida')) result.profile.purpose = 'organize_life';

  // Completed goals parsing
  const completedMatch = contextStr.match(/Metas ya completadas hoy:\s*([\s\S]*?)(?=Metas pendientes|¡Todas las metas|Racha|$)/);
  if (completedMatch && completedMatch[1]) {
    const lines = completedMatch[1].split('\n');
    for (const l of lines) {
      const g = l.match(/✓\s*"([^"]+)"/);
      if (g && g[1]) result.goals.completed.push(g[1].trim());
    }
  }

  // Pending goals parsing
  const pendingMatch = contextStr.match(/Metas pendientes para hoy:\s*([\s\S]*?)(?=Racha|ESTADO|$)/);
  if (pendingMatch && pendingMatch[1]) {
    const lines = pendingMatch[1].split('\n');
    for (const l of lines) {
      const g = l.match(/○\s*"([^"]+)"/);
      if (g && g[1]) result.goals.pending.push(g[1].trim());
    }
  }

  result.goals.all = [...result.goals.completed, ...result.goals.pending];
  result.goals.total = result.goals.all.length;

  // Streak
  const streakMatch = contextStr.match(/Racha de días activos:\s*(\d+)/);
  if (streakMatch && streakMatch[1]) {
    result.streak = parseInt(streakMatch[1], 10) || 0;
  }

  // Mood
  const moodScoreMatch = contextStr.match(/Puntaje de ánimo:\s*(\d+)\/5/);
  if (moodScoreMatch && moodScoreMatch[1]) {
    result.mood.recorded = true;
    result.mood.score = parseInt(moodScoreMatch[1], 10);
    result.mood.isLow = result.mood.score <= 2;
  }

  const energyMatch = contextStr.match(/Nivel de energía:\s*(\d+)\/5/);
  if (energyMatch && energyMatch[1]) {
    result.mood.energyScore = parseInt(energyMatch[1], 10);
  }

  const emotionsMatch = contextStr.match(/Emociones sentidas:\s*([^\n]+)/);
  if (emotionsMatch && emotionsMatch[1]) {
    result.mood.emotions = emotionsMatch[1].split(',').map(s => s.trim());
  }

  const triggersMatch = contextStr.match(/Detonantes\/Factores influyentes:\s*([^\n]+)/);
  if (triggersMatch && triggersMatch[1]) {
    result.mood.triggers = triggersMatch[1].split(',').map(s => s.trim());
  }

  const notesMatch = contextStr.match(/Nota personal:\s*"([^"]+)"/);
  if (notesMatch && notesMatch[1]) {
    result.mood.notes = notesMatch[1];
  }

  return result;
}

/**
 * Checks safety risk categories (A-G: ideation, extreme despair, self-harm, farewells).
 */
export function detectRiskIntent(text: string): boolean {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const riskPhrases = [
    'quiero morir', 'deseo morir', 'quitarme la vida', 'suicidarme', 'acabar con todo', 
    'no quiero vivir', 'ya no puedo mas con mi vida', 'dejar de existir', 'desaparecer para siempre',
    'nadie me va a extrañar', 'seria mejor si estuviera muerto', 'estarian mejor sin mi',
    'autolesion', 'cortarme', 'hacerme dano', 'tomarme todas las pastillas', 'tirarme de un puente',
    'me despido de todos', 'dejar todo listo para irme', 'no hay salida', 'mi vida no vale nada',
    'quiero dormir y no despertar'
  ];

  return riskPhrases.some(phrase => normalized.includes(phrase));
}

/**
 * Generates an empathetic, tailored, creative response when offline or fallback.
 */
export function generateSmartFallbackResponse(
  message: string,
  history: Array<{ role: string; text: string }>,
  contextStr: string
): { text: string; risk_flag: boolean } {
  // 1. Critical safety protocol
  if (detectRiskIntent(message)) {
    return {
      text: "Siento mucho que estés pasando por un momento tan difícil. Tu seguridad es lo más importante en este momento y quiero que sepas que no estás solo/a. Por favor, revisa los recursos de apoyo en pantalla.",
      risk_flag: true
    };
  }

  const ctx = parseContextString(contextStr);
  const normalized = message.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const completedText = ctx.goals.completed.length > 0 
    ? ctx.goals.completed.map(g => `"${g}"`).join(' y ')
    : '';

  // Has the user completed all goals today?
  const allCompleted = ctx.goals.total > 0 && ctx.goals.pending.length === 0;

  // Variation selector based on history length and char count to avoid repeats
  const turnIndex = history.filter(m => m.role === 'user').length;

  // Intent A: Greeting ("hola", "como vas", "buenas", "que tal")
  const isGreeting = /^(hola|hola!|buenas|buenos dias|buenas tardes|buenas noches|que tal|como vas|como te va|hey|saludos)/i.test(normalized) ||
    normalized.includes('como vas') || normalized.includes('como te va') || normalized === 'hola';

  if (isGreeting) {
    if (allCompleted) {
      const options = [
        `¡Hola! Por aquí con excelente energía y muy contento de acompañarte hoy. Veo que ya completaste todas tus metas de la jornada (${completedText}). ¡Qué gran sensación de logro! ¿Cómo te sientes tú en este momento y cómo te gustaría aprovechar el resto del día?`,
        `¡Qué gusto saludarte! Estoy muy bien, gracias por preguntar. Me alegra mucho ver que tus metas de hoy (${completedText}) ya quedaron listas con éxito. Tu hábito de avanzar paso a paso está dando frutos. ¿Cómo va marchando tu día?`,
        `¡Hola! Todo muy bien por aquí. Justo estaba viendo tu registro de hoy: ¡ya tienes tachadas tus metas de hoy (${completedText})! Es un excelente momento para reconocer ese avance. ¿Cómo te sientes con esta jornada?`
      ];
      return { text: options[turnIndex % options.length], risk_flag: false };
    }

    if (ctx.goals.completed.length > 0) {
      const options = [
        `¡Hola! Muy bien por aquí, listo para apoyarte. Veo que ya avanzaste hoy con ${completedText}, ¡un gran paso ganado! Aún tienes pendiente el resto de tus metas. ¿Cómo te encuentras de energía para abordarlas o prefieres hacer una pequeña pausa?`,
        `¡Qué bueno tenerte por acá! Por aquí todo en orden y enfocado en tu camino. Ya diste un gran avance hoy con ${completedText}. Cuéntame, ¿cómo sientes tu ritmo en este momento?`
      ];
      return { text: options[turnIndex % options.length], risk_flag: false };
    }

    if (ctx.goals.pending.length > 0) {
      const nextGoal = ctx.goals.pending[0];
      return {
        text: `¡Hola! Muy bien por aquí y con toda la disposición para acompañarte. Para hoy tienes programadas tus metas, entre ellas "${nextGoal}". Si prefieres dar un paso pequeño y sin presión, podemos enfocar solo un par de minutos en arrancar. ¿Cómo te sientes de ánimos en este momento?`,
        risk_flag: false
      };
    }

    return {
      text: `¡Hola! Qué gusto saludarte. Estoy aquí listo para acompañarte en tu bienestar y en la construcción de tus hábitos. Cuéntame, ¿cómo va tu día hoy y en qué te gustaría que enfoquemos nuestra atención?`,
      risk_flag: false
    };
  }

  // Intent B: Mood is "regular", "más o menos", "cansado", "desanimado", "pesado", "bajón"
  const isFeelingLowOrMeh = /^(regular|mas o menos|ahi|ahi vamos|pesado|cansado|agotado|sin ganas|desanimado|triste|mal|aburrido|estresado|bloqueado)/i.test(normalized) ||
    normalized.includes('regular') || normalized.includes('mas o menos') || normalized.includes('cansado') || normalized.includes('sin ganas') || normalized.includes('no muy bien');

  if (isFeelingLowOrMeh) {
    if (allCompleted) {
      const options = [
        `Te escucho y te entiendo profundamente... Los días "regulares" o con la energía baja son completamente válidos y humanos. No todos los días tienen que ser un pico de productividad ni de alegría desbordante. Lo valioso es que, aun sin estar al cien, lograste cumplir con tus metas de hoy (${completedText}). Eso demuestra que tus hábitos te sostienen incluso cuando el ánimo flaquea. ¿Sientes que esa sensación viene más de cansancio físico, de sobrecarga mental o de alguna preocupación en particular? Aquí estoy para escucharte.`,
        `Comprendo totalmente esa sensación de "regular". A veces el cuerpo o la mente simplemente nos piden bajar la velocidad, y está bien darse ese permiso sin juzgarse. Tienes a tu favor que ya dejaste cubiertas tus metas clave (${completedText}), así que no tienes nada pendiente que te presione hoy. ¿Te serviría descansar un rato, desconectar pantallas o simplemente desahogarte sobre lo que traes en mente?`
      ];
      return { text: options[turnIndex % options.length], risk_flag: false };
    }

    const options = [
      `Te entiendo y valido mucho lo que sientes. Tener momentos o días "regulares" es parte natural de la vida. Tu perfil nos recuerda el valor de los pasos pequeños: en días así, la regla de oro es bajar la exigencia y no forzarte. Si tienes metas pendientes, está perfecto dejarlas en pausa o hacer apenas una versión mínima de 1 minuto. ¿Qué crees que necesita más tu cuerpo y tu mente en este instante: descanso, silencio o desahogarte?`,
      `Siento que el día se sienta regular o pesado. Recuerda que no tienes que resolverlo todo de inmediato ni fingir que todo está perfecto. La amabilidad contigo mismo es la herramienta más poderosa hoy. ¿Hay algo puntual que te esté drenando la energía o simplemente se siente como un día gris sin motivo aparente? Aquí tienes un espacio seguro para escribirlo.`
    ];
    return { text: options[turnIndex % options.length], risk_flag: false };
  }

  // Intent C: Positive / Good ("bien", "muy bien", "excelente", "genial", "feliz", "tranquilo", "motivado")
  const isPositive = /^(bien|muy bien|super|excelente|genial|tranquilo|contento|feliz|motivado|con energia|de buen animo)/i.test(normalized) ||
    normalized === 'bien' || normalized === 'muy bien';

  if (isPositive) {
    if (allCompleted) {
      const options = [
        `¡Qué alegría leer eso! Se siente gratificante cuando el bienestar acompaña, y saber que ya dejaste tus metas cumplidas (${completedText}) suma mucha paz mental. Mantener esa sintonía refuerza tu racha y tus hábitos sostenibles. ¿Tienes algún plan agradable para ti el resto del día o vas a tomarte un tiempo de ocio?`,
        `¡Excelente! Me alegra un montón que estés bien. Esos días donde la mente se siente despejada son ideales para disfrutar el presente y reconocer lo que estás construyendo en Ruta. ¿Cómo te gustaría canalizar esa buena energía hoy?`
      ];
      return { text: options[turnIndex % options.length], risk_flag: false };
    }

    if (ctx.goals.pending.length > 0) {
      return {
        text: `¡Qué buena energía! Aprovechar esos momentos de buen ánimo para avanzar en lo que te propusiste hace toda la diferencia. Aún tienes pendiente ${ctx.goals.pending.map(g => `"${g}"`).join(', ')}. ¿Te gustaría abordar alguna de ellas ahora con este buen impulso?`,
        risk_flag: false
      };
    }

    return {
      text: `¡Me alegra muchísimo! Mantener esa claridad y buen ánimo es el mejor motor para tus metas diarias. ¿Hay algo en lo que te gustaría enfocarte o reflexionar hoy?`,
      risk_flag: false
    };
  }

  // Intent D: Gratitude ("gracias", "muchas gracias", "te lo agradezco")
  if (normalized.includes('gracias') || normalized.includes('agradezco')) {
    return {
      text: `¡Con todo el cariño del mundo! Para eso estoy aquí: para caminar contigo, celebrar tus victorias (como tus metas de hoy) y ser un ancla de serenidad cuando las cosas no estén al cien. ¿Hay algo más en lo que te gustaría profundizar hoy?`,
      risk_flag: false
    };
  }

  // Intent E: Asking for ideas, habits or strategies ("que hago", "como hago", "consejo", "ayuda", "recomiendame")
  if (normalized.includes('consejo') || normalized.includes('que hago') || normalized.includes('como hago') || normalized.includes('recomiendame') || normalized.includes('estrategia')) {
    if (ctx.profile.approach === 'small_steps') {
      return {
        text: `Dado que tu enfoque natural se potencia con pasos pequeños y claros, mi mejor recomendación hoy es la "regla de los dos minutos": nunca intentes hacer todo de golpe. Elige una sola micro-acción que puedas iniciar en menos de 120 segundos. Al cumplirla, tu cerebro libera dopamina por logro y reduce la fricción mental. Si quieres podemos estructurar juntos una de tus metas en un paso mínimo. ¿Te gustaría intentarlo?`,
        risk_flag: false
      };
    }
    return {
      text: `Para mantener el balance, lo más efectivo es conectar lo que haces hoy con tu propósito a largo plazo. Pregúntate: "¿Qué pequeña acción de hoy me hará sentir orgulloso/a al irme a dormir?". A veces un simple momento de respiración, un vaso de agua o dar por cumplido un hábito diario cambia por completo la perspectiva. ¿Cómo resuena esto contigo?`,
      risk_flag: false
    };
  }

  // Default Conversational Synthesis: Empathetic, deep, contextual & non-repetitive
  const contextualAnchor = allCompleted
    ? `Teniendo tus metas de hoy ya cumplidas (${completedText}), tienes un terreno ganado enorme.`
    : ctx.goals.pending.length > 0
    ? `Teniendo en mente tus metas de hoy (${ctx.goals.pending.map(g => `"${g}"`).join(', ')}), podemos ir a tu propio compás.`
    : '';

  const closingQuestions = [
    `¿Cómo te gustaría que abordemos este momento juntos?`,
    `¿Qué es lo que más tranquilidad o claridad te aportaría en este instante?`,
    `Cuéntame un poco más sobre cómo lo estás viviendo hoy, me encantaría entenderte mejor.`
  ];

  const selectedQuestion = closingQuestions[turnIndex % closingQuestions.length];

  return {
    text: `Entiendo lo que mencionas. ${contextualAnchor} Tu bienestar se construye paso a paso, respetando tus ritmos y reconociendo cada avance que realizas en la aplicación. ${selectedQuestion}`,
    risk_flag: false
  };
}
