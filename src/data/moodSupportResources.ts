export interface BookReview {
  id: string;
  title: string;
  author: string;
  year?: string;
  coverColor: string;
  tag: string;
  synopsis: string;
  socialIntelligenceFocus: string;
  whyItHelpsLowMood: string;
  keyExercise: string;
  readingPace: string;
}

export interface VideoReview {
  id: string;
  title: string;
  speaker: string;
  channelOrEvent: string;
  duration: string;
  youtubeId: string;
  youtubeUrl: string;
  tag: string;
  synopsis: string;
  socialIntelligenceApplication: string;
  whyItHelpsLowMood: string;
  keyTakeaway: string;
}

export interface SocialIntelligenceTip {
  id: string;
  title: string;
  principle: string;
  description: string;
  actionableStep: string;
  examplePhrase?: string;
  category: 'conexion' | 'limites' | 'autocompasion' | 'co-regulacion';
}

export const CURATED_BOOK_REVIEWS: BookReview[] = [
  {
    id: 'sentirse-bien',
    title: 'Sentirse Bien: Una nueva terapia contra las depresiones',
    author: 'Dr. David D. Burns (Escuela de Medicina de Stanford)',
    year: '1980 / Edición revisada',
    coverColor: 'from-amber-600 to-amber-800',
    tag: 'Terapia Cognitiva y Autojuicio',
    synopsis: 'La obra pionera de la Terapia Cognitivo-Conductual que revolucionó el tratamiento del desánimo persistente. Demuestra mediante evidencia clínica que no son los hechos externos los que determinan nuestro estado de ánimo, sino las distorsiones de pensamiento con las que los interpretamos (catastrofización, filtro negativo y lectura del pensamiento ajeno).',
    socialIntelligenceFocus: 'Explica con rigor cómo el desánimo altera las interacciones interpersonales: la persona deprimida suele asumir que los demás la juzgan, la rechazan o la consideran "una molestia", retrayéndose socialmente y confirmando falsamente su aislamiento. Burns enseña técnicas de empatía activa y desarme de la crítica hostil.',
    whyItHelpsLowMood: 'Proporciona herramientas prácticas e inmediatas de papel y lápiz que desmontan el bucle de autoinvalidación y desesperanza sin requerir un esfuerzo mental extenuante.',
    keyExercise: 'La técnica de la triple columna: anota en la columna 1 el pensamiento automático que te nubla (ej. "a nadie le importo"); identifica en la columna 2 la distorsión cognitiva (lectura de mente / generalización); y formula en la columna 3 una respuesta racional y compasiva.',
    readingPace: 'Capítulos modulares de 10 a 15 minutos; ideal para leer despacio.'
  },
  {
    id: 'encuentra-tu-persona-vitamina',
    title: 'Encuentra tu persona vitamina',
    author: 'Dra. Marian Rojas Estapé (Médico Psiquiatra)',
    year: '2021',
    coverColor: 'from-teal-600 to-teal-800',
    tag: 'Neurobiología y Vínculos Sanadores',
    synopsis: 'Un puente fascinante entre la psiquiatría clínica y la neurociencia de los vínculos afectivos. La Dra. Rojas Estapé explica cómo las relaciones interpersonales modulan directamente la secreción de cortisol (la hormona de la alerta y la inflamación emocional) y oxitocina (la molécula del apego seguro, la calma y la empatía).',
    socialIntelligenceFocus: 'Inteligencia social aplicada a la biología relacional: cómo identificar personas que recargan tu energía versus aquellas que te desgastan, cómo salir del papel de complaciente crónico y aprender a comunicar tus límites sin culpa para no vaciar tu reserva emocional.',
    whyItHelpsLowMood: 'Cuando el ánimo bajo se prolonga, el instinto común es cerrarse al contacto. Este libro explica por qué la presencia de una sola persona segura ("persona vitamina") actúa como un potente regulador neuroquímico capaz de frenar el dolor emocional.',
    keyExercise: 'El mapa de vínculos seguros: dibuja un círculo central con tu nombre y tres círculos concéntricos. Coloca en el más cercano a las personas con quienes puedes ser vulnerable sin temor a ser juzgado. Comprométete a contactar a una de ellas cuando sientas que el ánimo decae.',
    readingPace: 'Lenguaje ameno, cálido y divulgativo; muy fluido de asimilar.'
  },
  {
    id: 'se-amable-contigo-mismo',
    title: 'Sé amable contigo mismo (Autocompasión)',
    author: 'Dra. Kristin Neff (Universidad de Texas en Austin)',
    year: '2011',
    coverColor: 'from-rose-600 to-rose-800',
    tag: 'Autocompasión y Humanidad Compartida',
    synopsis: 'Frente a la tiranía de la autoestima tradicional (que depende del éxito constante y de sentirse superior a los demás), la Dra. Neff propone la autocompasión como un ancla psicológica indestructible basada en tres pilares: bondad hacia uno mismo, atención plena (mindfulness) y humanidad compartida.',
    socialIntelligenceFocus: 'El concepto de "Humanidad Compartida" es pura inteligencia social: comprender que el dolor, la debilidad, la tristeza y el error no te aíslan del mundo, sino que son el tejido común que nos une a todos los seres humanos. Desactiva la vergüenza y el estigma social del desánimo.',
    whyItHelpsLowMood: 'El desánimo persistente se perpetúa cuando nos juzgamos con dureza por estar desanimados. La autocompasión rompe esa segunda capa de sufrimiento autoimpuesto, brindando el soporte emocional que necesitamos para recomenzar.',
    keyExercise: 'La pausa de la autocompasión: ante un momento de dolor o vacío, coloca una mano sobre tu pecho o mejilla (contacto físico auto-tranquilizador) y dite internamente: 1) "Esto es un momento de sufrimiento", 2) "El sufrimiento es parte de la vida humana", 3) "Que pueda ser amable conmigo en este instante".',
    readingPace: 'Repleto de ejercicios breves y ejemplos cotidianos.'
  },
  {
    id: 'inteligencia-social-goleman',
    title: 'Inteligencia Social: La nueva ciencia de las relaciones humanas',
    author: 'Daniel Goleman',
    year: '2006',
    coverColor: 'from-blue-600 to-blue-800',
    tag: 'Neurociencia Social y Co-regulación',
    synopsis: 'La continuación natural de su clásico sobre Inteligencia Emocional. Goleman revela los descubrimientos sobre el "cerebro social", las neuronas espejo y los circuitos que nos sintonizan instantáneamente con los estados de ánimo de quienes nos rodean.',
    socialIntelligenceFocus: 'Desglosa la inteligencia social en dos dimensiones: la conciencia social (empatía primordial, sintonía y cognición social) y la aptitud social (sincronía, autorrepresentación, influencia e interés por los demás). Ofrece pautas para no dejarse arrastrar por dinámicas sociales tóxicas y aprender a co-regularse con entornos saludables.',
    whyItHelpsLowMood: 'Ayuda a entender por qué el aislamiento produce un "secuestro" de la atención hacia pensamientos rumiantes y cómo pequeños intercambios amables con el entorno (incluso con desconocidos en la vida diaria) activan circuitos de recompensa y vitalidad.',
    keyExercise: 'Micro-sintonía de presencia: durante tu próxima conversación, silencia la urgencia de formular un consejo o respuesta; enfócate 100% en el tono de voz y la mirada de la otra persona. Permite que la conexión genuina te saque del bucle de tus propios pensamientos.',
    readingPace: 'Rico en casos y estudios científicos; lectura reflexiva y enriquecedora.'
  },
  {
    id: 'hombre-en-busca-de-sentido',
    title: 'El hombre en busca de sentido',
    author: 'Viktor E. Frankl',
    year: '1946 / Clásico atemporal',
    coverColor: 'from-stone-700 to-stone-900',
    tag: 'Logoterapia y Sentido Existencial',
    synopsis: 'El relato conmovedor del psiquiatra austríaco sobre su supervivencia en los campos de concentración nazis y el nacimiento de la Logoterapia. Frankl demuestra que cuando un ser humano encuentra un "por qué" para vivir, es capaz de soportar y transformar casi cualquier "cómo".',
    socialIntelligenceFocus: 'El sentido de la vida nunca se encuentra en el egocentrismo aislado, sino en la autotrascendencia: en el amor hacia otra persona, en el servicio desinteresado hacia una causa o en la actitud digna con la que asumimos un sufrimiento inevitable.',
    whyItHelpsLowMood: 'Para momentos donde el bajo estado de ánimo se experimenta como una falta de propósito o vacío existencial. Brinda una perspectiva profunda y conmovedora sobre la dignidad del espíritu humano.',
    keyExercise: 'La pregunta invertida: en lugar de preguntarte "¿qué tiene la vida para ofrecerme hoy?", pregúntate "¿qué me está pidiendo la vida a mí en este momento?". Puede ser simplemente cuidar de ti hoy, enviar un mensaje de gratitud o cumplir con calma una pequeña tarea.',
    readingPace: 'Libro breve (~150 páginas), profundo e inolvidable.'
  }
];

export const CURATED_YOUTUBE_REVIEWS: VideoReview[] = [
  {
    id: 'brene-brown-vulnerabilidad',
    title: 'El poder de la vulnerabilidad (The Power of Vulnerability)',
    speaker: 'Dra. Brené Brown (Investigadora social)',
    channelOrEvent: 'TED Talks',
    duration: '20 minutos',
    youtubeId: 'iCvmsMzlF7o',
    youtubeUrl: 'https://www.youtube.com/watch?v=iCvmsMzlF7o',
    tag: 'Conexión Humana y Vergüenza',
    synopsis: 'Una de las conferencias TED más vistas y transformadoras de todos los tiempos. La investigadora Brené Brown desentraña seis años de investigación sobre la vergüenza, el miedo al rechazo y la necesidad biológica de conexión humana. Descubre que las personas que viven con plenitud comparten un rasgo clave: el coraje de ser imperfectos y mostrarse vulnerables.',
    socialIntelligenceApplication: 'Desarma la falsa creencia de que tener un bajo estado de ánimo o necesitar apoyo es signo de debilidad. Enseña que admitir "hoy me cuesta y necesito ayuda" es la piedra angular para forjar vínculos verdaderamente profundos y seguros.',
    whyItHelpsLowMood: 'Disuelve el sentimiento de inadecuación y soledad que suele acompañar a las rachas de desánimo persistente, invitando a dejar caer las máscaras sociales que agotan la energía.',
    keyTakeaway: 'La vulnerabilidad no es ganar ni perder; es el coraje de estar presente y dejarse ver cuando no puedes controlar el resultado.'
  },
  {
    id: 'marian-rojas-cortisol-tristeza',
    title: 'Cómo salir del bucle de la tristeza, el cortisol y las personas que nos rodean',
    speaker: 'Dra. Marian Rojas Estapé',
    channelOrEvent: 'Aprendemos Juntos (BBVA) / Conferencias Oficiales',
    duration: '18 minutos',
    youtubeId: 'F36u9hH9p0s',
    youtubeUrl: 'https://www.youtube.com/watch?v=F36u9hH9p0s',
    tag: 'Gestión Neurobiológica y Vínculos',
    synopsis: 'La prestigiosa psiquiatra aborda cómo la mente no distingue una amenaza real de una imaginada: cuando rumiamos sobre nuestros fracasos o miedos pasados, intoxicamos al organismo de cortisol constante, generando apatía, dolor muscular y tristeza profunda.',
    socialIntelligenceApplication: 'Explica cómo las palabras de apoyo y el abrazo de una persona de confianza liberan oxitocina instantánea, desarmando la alerta del sistema simpático. Sugiere aprender a comunicar qué tipo de apoyo necesitamos (un oído atento vs. un consejo apresurado).',
    whyItHelpsLowMood: 'Ofrece pautas biomecánicas y psicológicas muy sencillas (desde el control de la respiración hasta la desintoxicación de pantallas) para romper la espiral descendente del desánimo.',
    keyTakeaway: 'No te juzgues por tus emociones; comprende cómo funciona tu mente para no convertirte en el verdugo de tus propios días difíciles.'
  },
  {
    id: 'andrew-huberman-mood-neuroscience',
    title: 'Protocolos científicos para elevar el estado de ánimo, la motivación y la energía',
    speaker: 'Dr. Andrew Huberman (Profesor de Neurobiología en Stanford)',
    channelOrEvent: 'Huberman Lab Podcast',
    duration: '22 minutos (Extracto clave)',
    youtubeId: 'gXDMoiEkyu8',
    youtubeUrl: 'https://www.youtube.com/watch?v=gXDMoiEkyu8',
    tag: 'Neurociencia de la Dopamina y Ritmos',
    synopsis: 'El Dr. Huberman resume los mecanismos biológicos fundamentales que regulan el estado anímico y la energía vital: la sincronización del ritmo circadiano mediante luz natural matutina, el "suspiro fisiológico" para reducir la ansiedad en 30 segundos y la regulación de los picos de dopamina para evitar caídas bruscas.',
    socialIntelligenceApplication: 'Resalta el rol crítico de la co-presencia social: el contacto visual humano y la conversación cara a cara estimulan los circuitos serotoninérgicos de forma mucho más sostenida y saludable que las gratificaciones digitales aisladas.',
    whyItHelpsLowMood: 'Permite dejar de culparse por "falta de fuerza de voluntad" al entender que el desánimo persistente tiene bases neuroquímicas que pueden restaurarse con pequeños protocolos físicos sin coste.',
    keyTakeaway: 'No puedes controlar directamente tu mente solo con la mente; utiliza el cuerpo (luz, respiración, movimiento y contacto social) para cambiar el estado de tu cerebro.'
  },
  {
    id: 'david-burns-desmontando-desanimo',
    title: 'Superar la rumiación, el desánimo y la trampa del perfeccionismo',
    speaker: 'Dr. David D. Burns',
    channelOrEvent: 'Feeling Good Podcast & Lectures',
    duration: '25 minutos',
    youtubeId: 'H1T5uMeYv9Q',
    youtubeUrl: 'https://www.youtube.com/watch?v=H1T5uMeYv9Q',
    tag: 'Reestructuración del Pensamiento',
    synopsis: 'El Dr. Burns ilustra en vivo cómo una persona atrapada en semanas de pesimismo puede experimentar un cambio perceptible en cuestión de minutos al identificar la falsedad lógica de sus pensamientos automáticos de desvalorización.',
    socialIntelligenceApplication: 'Muestra las 5 técnicas de comunicación interpersonal asertiva (como el desarme y la indagación gentil), permitiendo resolver roces con familiares o colegas que a menudo son el detonante silencioso del bajón anímico.',
    whyItHelpsLowMood: 'Desmitifica la idea de que para mejorar se necesitan meses de espera: una sola creencia irracional corregida alivia de inmediato la pesadez en el pecho.',
    keyTakeaway: 'Tus sentimientos resultan de tus pensamientos, no de tus circunstancias. Cuando cambias la forma en que te hablas, transformas tu estado anímico.'
  },
  {
    id: 'eckhart-tolle-aceptacion-momento-dificil',
    title: 'La aceptación profunda del momento presente cuando el ánimo decae',
    speaker: 'Eckhart Tolle',
    channelOrEvent: 'Eckhart Tolle Official',
    duration: '14 minutos',
    youtubeId: 'DTKWZgQyT9c',
    youtubeUrl: 'https://www.youtube.com/watch?v=DTKWZgQyT9c',
    tag: 'Mindfulness y Alivio de la Resistencia',
    synopsis: 'Una charla de enorme serenidad donde Tolle explica que el 80% del sufrimiento ante un estado de ánimo bajo proviene de la resistencia interna: "No debería sentirme así", "Tengo que ser feliz ya". Cuando se permite que la emoción esté presente sin narrativa mental, la carga pesada se disuelve.',
    socialIntelligenceApplication: 'Fomenta la autenticidad relacional: dejar de fingir una sonrisa artificial en entornos sociales cuando por dentro sientes cansancio. Enseña a habitar los espacios con calma y presencia sin la presión del rendimiento social.',
    whyItHelpsLowMood: 'Es profundamente reconfortante para días donde intentar "pensar en positivo" resulta agotador o contraproducente; enseña a descansar en la quietud de la respiración.',
    keyTakeaway: 'Acepta lo que es como si lo hubieras elegido. La rendición a la realidad presente es el inicio de toda transformación auténtica.'
  }
];

export const SOCIAL_INTELLIGENCE_PRACTICES: SocialIntelligenceTip[] = [
  {
    id: 'micro-conexion',
    title: 'La Regla de la Micro-Conexión Segura',
    category: 'conexion',
    principle: 'Romper el aislamiento defensivo sin agotar la batería social',
    description: 'Cuando el ánimo decae, el cerebro activa un mecanismo de repliegue que nos susurra "aíslate". Sin embargo, el aislamiento total agudiza la rumiación negativa. La solución no es asistir a una fiesta o forzar una conversación de 2 horas, sino generar una micro-conexión de 30 segundos con una persona de confianza.',
    actionableStep: 'Envía un mensaje corto a una persona segura compartiendo presencia honesta sin pedir solución ni quejarte en exceso.',
    examplePhrase: '"Hola [Nombre], hoy ando con poca energía mental pero me acordé de ti y quería desearte un lindo día. No te preocupes por responder largo, solo quería saludarte."'
  },
  {
    id: 'desactivar-sesgo-carga',
    title: 'Desarmar la Falacia de "Ser una Carga"',
    category: 'autocompasion',
    principle: 'Reconocer que la vulnerabilidad crea confianza mutua',
    description: 'La baja de ánimo persistente suele venir acompañada del sesgo cognitivo de que pedir compañía o hablar de lo que sentimos "aburrirá" o "molestará" a los demás. Los estudios en psicología social demuestran lo contrario: cuando alguien a quien apreciamos nos comparte con honestidad que está pasando un mal momento, nos sentimos honrados y valorados en su círculo de confianza.',
    actionableStep: 'Haz el ejercicio inverso: piensa en qué harías tú si un buen amigo te dijera que se siente desanimado hoy. ¿Te molestaría o te gustaría estar ahí? Date a ti mismo ese mismo derecho relacional.'
  },
  {
    id: 'limites-asertivos',
    title: 'Establecer Límites Protectores de Batería Social',
    category: 'limites',
    principle: 'Proteger la energía emocional para permitir la recuperación',
    description: 'A veces el desánimo persistente no es tristeza aislada, sino agotamiento relacional acumulado por no haber sabido decir "no" a demandas ajenas o situaciones desgastantes. Decir "no" con cariño y firmeza es el mayor acto de autocuidado e inteligencia social.',
    actionableStep: 'Aprende a pausar compromisos no esenciales mientras tu estado anímico se estabiliza.',
    examplePhrase: '"Me encantaría participar más adelante, pero en este momento necesito unos días de descanso para recargar energía. Te aviso apenas esté más disponible."'
  },
  {
    id: 'co-presencia-silenciosa',
    title: 'Co-regulación a través de la Presencia Compartida',
    category: 'co-regulacion',
    principle: 'La compañía en silencio calma el sistema nervioso',
    description: 'El sistema nervioso de los mamíferos está biológicamente programado para regularse con la presencia de otros seres vivos. No es necesario hablar todo el tiempo: estar en la misma habitación leyendo, pasear a tu mascota o sentarte en una plaza concurrida brinda estimulación social pasiva sin demandar esfuerzo dialéctico.',
    actionableStep: 'Pídele a un amigo, familiar o pareja compartir un espacio de lectura o trabajo en silencio, o realiza una caminata en un parque concurrido observando la vida cotidiana.'
  }
];
