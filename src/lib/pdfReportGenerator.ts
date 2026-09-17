import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize virtual fonts for browser-side pdfmake
// Support both ES module and CommonJS font bundle structures
if ((pdfFonts as any)?.pdfMake?.vfs) {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
} else if ((pdfFonts as any)?.default?.pdfMake?.vfs) {
  (pdfMake as any).vfs = (pdfFonts as any).default.pdfMake.vfs;
} else if ((pdfFonts as any)?.vfs) {
  (pdfMake as any).vfs = (pdfFonts as any).vfs;
}

const QUESTION_MAP: Record<number, { text: string; options: Record<string, string> }> = {
  1: {
    text: '¿Cómo sueles reaccionar ante los retos?',
    options: {
      small_steps: 'Me gustan los pasos pequeños y claros',
      big_picture: 'Prefiero ver el panorama general y lanzarme'
    }
  },
  2: {
    text: '¿Qué te motiva más al completar una tarea?',
    options: {
      visual_reinforcement: 'Un refuerzo visual inmediato',
      long_term_goal: 'Saber que ayuda a mi meta a largo plazo'
    }
  },
  3: {
    text: '¿Cuál es tu nivel de energía típico durante el día?',
    options: {
      morning: 'Mañanero',
      afternoon: 'Vespertino',
      night: 'Nocturno'
    }
  },
  4: {
    text: '¿Cómo te sientes mejor siendo supervisado?',
    options: {
      constant_reminders: 'Con recordatorios constantes y gentiles',
      autonomy: 'Con autonomía total y reportes semanales'
    }
  },
  5: {
    text: '¿Cuál es tu principal propósito al usar \'Ruta\'?',
    options: {
      build_habits: 'Construir hábitos nuevos',
      achieve_big_goal: 'Lograr una meta grande',
      organize_life: 'Organizar mi vida'
    }
  }
};

export interface ExportReportDataParams {
  periodStart: number;
  periodEnd: number;
  goals: Array<{
    id: string;
    text: string;
    type: 'habito' | 'pequena' | 'mediana' | 'grande' | string;
    parentId?: string;
    completed: boolean;
    createdAt?: number;
  }>;
  activityLogs: Array<{
    timestamp: number;
    type?: string;
    moodValue?: string;
    goalId?: string;
    date?: string;
  }>;
  riskEvents?: Array<{
    timestamp: number;
  }>;
  userConsentedToRiskEvents?: boolean;
  includesRiskEvents?: boolean;
  onboardingAnswers: Record<string | number, string>;
}

export function generateReportPDF(params: ExportReportDataParams) {
  const {
    periodStart,
    periodEnd,
    goals,
    activityLogs,
    riskEvents = [],
    onboardingAnswers
  } = params;

  const hasRiskConsent = Boolean(params.userConsentedToRiskEvents ?? params.includesRiskEvents);

  // 1. Calculations: Time distribution & Mood counts
  const timeCounts = { morning: 0, afternoon: 0, night: 0 };
  const moodCounts: Record<string, number> = {};
  const checkInsPerGoal: Record<string, number> = {};
  const uniqueActiveDays = new Set<string>();

  activityLogs.forEach(log => {
    const d = new Date(log.timestamp);
    const h = d.getHours();
    if (h >= 6 && h < 12) timeCounts.morning++;
    else if (h >= 12 && h < 18) timeCounts.afternoon++;
    else timeCounts.night++;

    const dayKey = d.toISOString().split('T')[0];
    uniqueActiveDays.add(dayKey);

    if (log.moodValue) {
      moodCounts[log.moodValue] = (moodCounts[log.moodValue] || 0) + 1;
    }

    if (log.goalId) {
      checkInsPerGoal[log.goalId] = (checkInsPerGoal[log.goalId] || 0) + 1;
    }
  });

  const totalLogs = timeCounts.morning + timeCounts.afternoon + timeCounts.night;
  const pMorning = totalLogs ? Math.round((timeCounts.morning / totalLogs) * 100) : 0;
  const pAfternoon = totalLogs ? Math.round((timeCounts.afternoon / totalLogs) * 100) : 0;
  const pNight = totalLogs ? Math.round((timeCounts.night / totalLogs) * 100) : 0;

  // 2. Streaks calculation
  const sortedDays = Array.from(uniqueActiveDays).sort();
  let maxStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  sortedDays.forEach(dateStr => {
    const currentDate = new Date(dateStr);
    if (!lastDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    lastDate = currentDate;
    if (tempStreak > maxStreak) maxStreak = tempStreak;
  });

  // Calculate if the streak is active at period end
  if (sortedDays.length > 0) {
    const lastActive = new Date(sortedDays[sortedDays.length - 1]);
    const endD = new Date(periodEnd);
    const diffFromEnd = Math.round((endD.getTime() - lastActive.getTime()) / (1000 * 3600 * 24));
    currentStreak = diffFromEnd <= 1 ? tempStreak : 0;
  }

  // 3. Format Date
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // 4. Onboarding questions table data
  const questionRows = Object.entries(QUESTION_MAP).map(([idStr, q]) => {
    const id = Number(idStr);
    const rawVal = onboardingAnswers[id] || onboardingAnswers[idStr];
    const answerLabel = (rawVal && q.options[rawVal]) ? `${q.options[rawVal]} (Código: ${rawVal})` : (rawVal || 'No registrado');
    return [
      { text: q.text, fontSize: 9 },
      { text: answerLabel, fontSize: 9 }
    ];
  });

  // 5. Goals Breakdown (Hierarchy)
  const goalItems = goals.map(g => {
    const count = checkInsPerGoal[g.id] || 0;
    const typeLabel = g.type === 'habito' ? 'Micro-hábito' : g.type === 'pequena' ? 'Meta pequeña' : g.type === 'mediana' ? 'Meta mediana' : 'Meta grande';
    const statusLabel = g.completed ? 'Completada' : 'En curso';
    return `[${statusLabel}] ${g.text} (${typeLabel}) — ${count} interacciones registradas en el periodo`;
  });

  // 6. Assemble Document Definition
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: {
      fontSize: 10,
      color: '#292524'
    },
    content: [
      // Encabezado
      {
        columns: [
          { text: 'RUTA — INFORME DE SEGUIMIENTO CONDUCTUAL', fontSize: 13, bold: true, color: '#1c1917' },
          {
            text: [
              { text: 'Generado: ', bold: true }, `${formatDate(Date.now())}\n`,
              { text: 'Periodo: ', bold: true }, `${formatDate(periodStart)} — ${formatDate(periodEnd)}`
            ],
            alignment: 'right',
            fontSize: 9
          }
        ],
        margin: [0, 0, 0, 15]
      },

      // Nota fija inmodificable
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: 'AVISO IMPORTANTE:\nEste documento es un resumen de datos de autorregistro proporcionados por el usuario a través de la aplicación Ruta. No constituye una evaluación clínica, diagnóstico, ni recomendación de tratamiento. Está destinado a servir como información complementaria para un profesional de la salud mental licenciado, quien deberá interpretarlo dentro del contexto clínico completo del paciente.',
                fillColor: '#f5f5f4',
                color: '#44403c',
                fontSize: 8.5,
                lineHeight: 1.3,
                margin: [8, 8, 8, 8],
                bold: true
              }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15]
      },

      // Sección 1: Perfilamiento Inicial
      { text: '1. Perfilamiento Inicial Autorreportado (Estilo de Refuerzo)', style: 'sectionHeader' },
      { text: 'Respuestas literales registradas por el usuario al inicio de la aplicación:', fontSize: 8.5, color: '#78716c', margin: [0, 0, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: ['50%', '50%'],
          body: [
            [
              { text: 'Pregunta (Dimensión Motivacional)', style: 'tableHeader' },
              { text: 'Respuesta Cruda Reportada', style: 'tableHeader' }
            ],
            ...questionRows
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 15]
      },

      // Sección 2: Adherencia y Consistencia
      { text: '2. Adherencia y Consistencia Conductual', style: 'sectionHeader' },
      {
        columns: [
          { text: `Racha máxima en el periodo: ${maxStreak} días consecutivos`, fontSize: 9.5, bold: true },
          { text: `Racha al cierre del periodo: ${currentStreak} días consecutivos`, fontSize: 9.5, bold: true }
        ],
        margin: [0, 0, 0, 8]
      },
      { text: 'Distribución horaria de interacciones con la aplicación:', fontSize: 8.5, color: '#78716c', margin: [0, 0, 0, 4] },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [
              { text: 'Mañana (06:00 - 11:59)', style: 'tableHeader' },
              { text: 'Tarde (12:00 - 17:59)', style: 'tableHeader' },
              { text: 'Noche (18:00 - 05:59)', style: 'tableHeader' }
            ],
            [
              { text: `${timeCounts.morning} (${pMorning}%)`, alignment: 'center' },
              { text: `${timeCounts.afternoon} (${pAfternoon}%)`, alignment: 'center' },
              { text: `${timeCounts.night} (${pNight}%)`, alignment: 'center' }
            ]
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 15]
      },

      // Sección 3: Estado de Ánimo
      { text: '3. Estado de Ánimo Autorreportado', style: 'sectionHeader' },
      Object.keys(moodCounts).length === 0
        ? { text: 'No se registraron check-ins de estado de ánimo en el periodo seleccionado.', fontSize: 9, italics: true, margin: [0, 0, 0, 15] }
        : {
            table: {
              headerRows: 1,
              widths: ['60%', '40%'],
              body: [
                [
                  { text: 'Valor Reportado', style: 'tableHeader' },
                  { text: 'Frecuencia Absoluta (N)', style: 'tableHeader' }
                ],
                ...Object.entries(moodCounts).map(([mood, count]) => [
                  { text: mood },
                  { text: count.toString(), alignment: 'center' }
                ])
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 15]
          },

      // Sección 4: Metas y Progreso
      { text: '4. Metas y Progreso Conductual', style: 'sectionHeader' },
      goalItems.length === 0
        ? { text: 'No hay metas registradas en el periodo.', fontSize: 9, italics: true, margin: [0, 0, 0, 15] }
        : {
            ul: goalItems,
            fontSize: 9,
            lineHeight: 1.3,
            margin: [0, 0, 0, 15]
          }
    ],
    styles: {
      sectionHeader: {
        fontSize: 11,
        bold: true,
        color: '#1c1917',
        margin: [0, 8, 0, 6]
      },
      tableHeader: {
        bold: true,
        fillColor: '#f5f5f4',
        color: '#1c1917',
        fontSize: 9
      }
    }
  };

  // Sección 5: Eventos de Riesgo (Condicional a consentimiento explícito)
  if (hasRiskConsent) {
    const formattedRiskDates = riskEvents.map(e => formatDate(e.timestamp));
    docDefinition.content.push(
      { text: '5. Registro de Activación de Protocolos de Seguridad', style: 'sectionHeader' },
      {
        text: 'El usuario ha consentido explícitamente incluir las fechas de activación de los protocolos de seguridad de la aplicación (eventos manuales o automáticos). No se incluye ningún contenido conversacional.',
        fontSize: 8.5,
        color: '#78716c',
        margin: [0, 0, 0, 6]
      },
      { text: `Total de eventos en el periodo: ${riskEvents.length}`, bold: true, fontSize: 9.5, margin: [0, 0, 0, 6] },
      formattedRiskDates.length === 0
        ? { text: 'Ningún evento registrado en el periodo.', fontSize: 9, italics: true }
        : {
            ul: formattedRiskDates,
            fontSize: 9
          }
    );
  }

  // Generate & Download PDF purely in the client
  const filename = `ruta_informe_seguimiento_${formatDate(periodStart).replace(/\//g, '-')}_al_${formatDate(periodEnd).replace(/\//g, '-')}.pdf`;
  pdfMake.createPdf(docDefinition).download(filename);
}
