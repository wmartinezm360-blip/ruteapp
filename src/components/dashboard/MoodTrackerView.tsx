import { useState, useEffect, useMemo } from 'react';
import { 
  Smile, 
  Frown, 
  Meh, 
  Sun, 
  CloudRain, 
  Sparkles, 
  Plus, 
  Calendar, 
  TrendingUp, 
  BatteryCharging, 
  BarChart2, 
  Filter, 
  Info, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Lightbulb,
  HeartHandshake,
  BookOpen
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell, 
  ReferenceLine 
} from 'recharts';
import { MoodLog } from '../../types';
import { getMoodLogs, saveMoodLog, deleteMoodLog } from '../../lib/firestoreService';
import { auth } from '../../lib/firebase';
import MoodSupportGuidanceSection from './MoodSupportGuidanceSection';

// Escalas de Ánimo predefinidas (1 a 5)
export const MOOD_SCALES = [
  { 
    score: 1, 
    label: 'Muy difícil', 
    sublabel: 'Agotado o angustiado',
    icon: CloudRain, 
    color: '#f43f5e', 
    bgColor: 'bg-rose-50', 
    borderColor: 'border-rose-200', 
    textColor: 'text-rose-700',
    dotColor: '#e11d48'
  },
  { 
    score: 2, 
    label: 'Bajo', 
    sublabel: 'Desanimado o tenso',
    icon: Frown, 
    color: '#f97316', 
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-200', 
    textColor: 'text-orange-700',
    dotColor: '#ea580c'
  },
  { 
    score: 3, 
    label: 'Neutro', 
    sublabel: 'Estable o en calma',
    icon: Meh, 
    color: '#eab308', 
    bgColor: 'bg-amber-50', 
    borderColor: 'border-amber-200', 
    textColor: 'text-amber-800',
    dotColor: '#ca8a04'
  },
  { 
    score: 4, 
    label: 'Bueno', 
    sublabel: 'Satisfecho y positivo',
    icon: Smile, 
    color: '#14b8a6', 
    bgColor: 'bg-teal-50', 
    borderColor: 'border-teal-200', 
    textColor: 'text-teal-700',
    dotColor: '#0d9488'
  },
  { 
    score: 5, 
    label: 'Excelente', 
    sublabel: 'Pleno y con vitalidad',
    icon: Sparkles, 
    color: '#10b981', 
    bgColor: 'bg-emerald-50', 
    borderColor: 'border-emerald-200', 
    textColor: 'text-emerald-700',
    dotColor: '#059669'
  }
];

export const DEFAULT_EMOTIONS = [
  'Calma',
  'Agradecido',
  'Motivado',
  'Alegría',
  'Orgullo',
  'Esperanza',
  'Enfocado',
  'Alivio',
  'Cansancio',
  'Estrés',
  'Frustración',
  'Ansiedad',
  'Abrumado',
  'Tristeza',
  'Desgano',
  'Incertidumbre'
];

export const DEFAULT_TRIGGERS = [
  'Sueño / Descanso',
  'Trabajo / Estudio',
  'Familia / Pareja',
  'Amigos / Vida Social',
  'Salud / Bienestar físico',
  'Ejercicio / Movimiento',
  'Metas y Hábitos',
  'Finanzas / Dinero',
  'Alimentación',
  'Tiempo Libre / Ocio',
  'Clima / Entorno',
  'Redes y Pantallas',
  'Tiempo a Solas'
];

interface MoodTrackerViewProps {
  onCheckinComplete?: () => void;
  initialTab?: 'charts' | 'patterns' | 'support' | 'history';
}

export default function MoodTrackerView({ onCheckinComplete, initialTab }: MoodTrackerViewProps) {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterRange, setFilterRange] = useState<'7d' | '14d' | '30d' | 'all'>('14d');
  const [activeTab, setActiveTab] = useState<'charts' | 'patterns' | 'support' | 'history'>(initialTab || 'charts');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Form State
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [editId, setEditId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(todayStr);
  const [formScore, setFormScore] = useState<number>(3);
  const [formEnergy, setFormEnergy] = useState<number>(3);
  const [formEmotions, setFormEmotions] = useState<string[]>([]);
  const [formTriggers, setFormTriggers] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [customEmotionInput, setCustomEmotionInput] = useState('');
  const [customTriggerInput, setCustomTriggerInput] = useState('');
  const [availableEmotions, setAvailableEmotions] = useState<string[]>(DEFAULT_EMOTIONS);
  const [availableTriggers, setAvailableTriggers] = useState<string[]>(DEFAULT_TRIGGERS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterTrigger, setFilterTrigger] = useState<string>('all');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await getMoodLogs();
      setLogs((data || []) as MoodLog[]);
    } catch (err) {
      console.error('Error fetching mood logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs by date range
  const filteredLogs = useMemo(() => {
    if (filterRange === 'all') return logs;
    const days = filterRange === '7d' ? 7 : filterRange === '14d' ? 14 : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toLocaleDateString('en-CA');
    return logs.filter(l => l.date >= cutoffStr);
  }, [logs, filterRange]);

  // Check if today already has a log
  const todayLog = useMemo(() => {
    return logs.find(l => l.date === todayStr);
  }, [logs, todayStr]);

  const openNewCheckin = (existingLog?: MoodLog) => {
    if (existingLog) {
      setEditId(existingLog.id);
      setFormDate(existingLog.date);
      setFormScore(existingLog.score);
      setFormEnergy(existingLog.energyScore ?? 3);
      setFormEmotions(existingLog.emotions || []);
      setFormTriggers(existingLog.triggers || []);
      setFormNotes(existingLog.notes || '');
    } else {
      setEditId(todayLog ? todayLog.id : null);
      setFormDate(todayStr);
      setFormScore(todayLog ? todayLog.score : 4);
      setFormEnergy(todayLog ? (todayLog.energyScore ?? 3) : 3);
      setFormEmotions(todayLog ? todayLog.emotions : ['Calma']);
      setFormTriggers(todayLog ? todayLog.triggers : []);
      setFormNotes(todayLog ? (todayLog.notes || '') : '');
    }
    setShowModal(true);
  };

  const handleToggleEmotion = (emotion: string) => {
    setFormEmotions(prev => 
      prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]
    );
  };

  const handleToggleTrigger = (trigger: string) => {
    setFormTriggers(prev => 
      prev.includes(trigger) ? prev.filter(t => t !== trigger) : [...prev, trigger]
    );
  };

  const handleAddCustomEmotion = () => {
    const trimmed = customEmotionInput.trim();
    if (!trimmed) return;
    if (!availableEmotions.includes(trimmed)) {
      setAvailableEmotions(prev => [...prev, trimmed]);
    }
    if (!formEmotions.includes(trimmed)) {
      setFormEmotions(prev => [...prev, trimmed]);
    }
    setCustomEmotionInput('');
  };

  const handleAddCustomTrigger = () => {
    const trimmed = customTriggerInput.trim();
    if (!trimmed) return;
    if (!availableTriggers.includes(trimmed)) {
      setAvailableTriggers(prev => [...prev, trimmed]);
    }
    if (!formTriggers.includes(trimmed)) {
      setFormTriggers(prev => [...prev, trimmed]);
    }
    setCustomTriggerInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await saveMoodLog({
        id: editId || undefined,
        date: formDate,
        score: formScore,
        energyScore: formEnergy,
        emotions: formEmotions,
        triggers: formTriggers,
        notes: formNotes
      });

      setShowModal(false);
      await fetchLogs();
      if (onCheckinComplete) onCheckinComplete();
    } catch (err) {
      console.error('Error saving mood log:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de ánimo?')) return;
    try {
      await deleteMoodLog(id);
      await fetchLogs();
    } catch (err) {
      console.error('Error deleting mood log:', err);
    }
  };

  // Seed sample data for preview if empty
  const handleSeedSampleData = async () => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const sampleDays = [
        { d: 13, score: 3, energy: 3, emotions: ['Calma', 'Cansancio'], triggers: ['Trabajo / Estudio', 'Sueño / Descanso'], notes: 'Día largo en pendientes, logré descansar bien.' },
        { d: 12, score: 4, energy: 4, emotions: ['Motivado', 'Orgullo'], triggers: ['Metas y Hábitos', 'Ejercicio / Movimiento'], notes: 'Completé mis metas temprano.' },
        { d: 11, score: 2, energy: 2, emotions: ['Estrés', 'Cansancio'], triggers: ['Trabajo / Estudio', 'Redes y Pantallas'], notes: 'Mucho tiempo frente a la pantalla y plazos ajustados.' },
        { d: 10, score: 4, energy: 4, emotions: ['Agradecido', 'Alegría'], triggers: ['Sueño / Descanso', 'Amigos / Vida Social'], notes: 'Buen descanso y cena con amigos.' },
        { d: 9, score: 5, energy: 5, emotions: ['Alegría', 'Enfocado', 'Esperanza'], triggers: ['Sueño / Descanso', 'Ejercicio / Movimiento', 'Metas y Hábitos'], notes: 'Día muy productivo y en calma.' },
        { d: 8, score: 3, energy: 3, emotions: ['Calma'], triggers: ['Tiempo a Solas', 'Alimentación'], notes: 'Cociné en casa y leí un poco.' },
        { d: 7, score: 2, energy: 2, emotions: ['Frustración', 'Ansiedad'], triggers: ['Trabajo / Estudio', 'Finanzas / Dinero'], notes: 'Preocupaciones de presupuesto y carga laboral.' },
        { d: 6, score: 4, energy: 3, emotions: ['Agradecido', 'Calma'], triggers: ['Familia / Pareja', 'Sueño / Descanso'], notes: 'Tiempo en familia reparador.' },
        { d: 5, score: 4, energy: 4, emotions: ['Motivado', 'Enfocado'], triggers: ['Metas y Hábitos', 'Salud / Bienestar físico'], notes: 'Retomé mi rutina matutina.' },
        { d: 4, score: 3, energy: 3, emotions: ['Calma', 'Desgano'], triggers: ['Clima / Entorno'], notes: 'Día lluvioso, ritmo más pausado.' },
        { d: 3, score: 5, energy: 4, emotions: ['Orgullo', 'Alegría', 'Motivado'], triggers: ['Metas y Hábitos', 'Sueño / Descanso', 'Tiempo Libre / Ocio'], notes: 'Avance importante en proyecto personal.' },
        { d: 2, score: 4, energy: 4, emotions: ['Esperanza', 'Agradecido'], triggers: ['Ejercicio / Movimiento', 'Sueño / Descanso'], notes: 'Salí a caminar y descansé 8 horas.' },
        { d: 1, score: 4, energy: 3, emotions: ['Calma', 'Enfocado'], triggers: ['Metas y Hábitos', 'Tiempo a Solas'], notes: 'Planificando los próximos objetivos con serenidad.' }
      ];

      const now = new Date();
      for (const sample of sampleDays) {
        const pastDate = new Date(now);
        pastDate.setDate(now.getDate() - sample.d);
        const dateStr = pastDate.toLocaleDateString('en-CA');
        await saveMoodLog({
          date: dateStr,
          score: sample.score,
          energyScore: sample.energy,
          emotions: sample.emotions,
          triggers: sample.triggers,
          notes: sample.notes
        });
      }
      await fetchLogs();
    } catch (err) {
      console.error('Error seeding data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ANALYTICS COMPUTATIONS ---
  const overallAvgMood = useMemo(() => {
    if (filteredLogs.length === 0) return 0;
    const sum = filteredLogs.reduce((acc, l) => acc + (l.score || 0), 0);
    return Number((sum / filteredLogs.length).toFixed(1));
  }, [filteredLogs]);

  const overallAvgEnergy = useMemo(() => {
    if (filteredLogs.length === 0) return 0;
    const sum = filteredLogs.reduce((acc, l) => acc + (l.energyScore || 3), 0);
    return Number((sum / filteredLogs.length).toFixed(1));
  }, [filteredLogs]);

  // Chart 1: Time series evolution
  const timeSeriesData = useMemo(() => {
    const sorted = [...filteredLogs].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map(l => {
      const d = new Date(l.date + 'T12:00:00');
      const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      const scaleObj = MOOD_SCALES.find(s => s.score === l.score);
      return {
        date: l.date,
        displayDate: label,
        score: l.score,
        energy: l.energyScore ?? 3,
        moodLabel: scaleObj ? scaleObj.label : `${l.score}/5`,
        emotions: (l.emotions || []).join(', '),
        triggers: (l.triggers || []).join(', ')
      };
    });
  }, [filteredLogs]);

  // Chart 2: Triggers Cross Analysis (Impact on Mood)
  // For each trigger, calculate: count, average mood when present, and difference vs overall avg
  const triggerImpactData = useMemo(() => {
    if (filteredLogs.length === 0) return [];
    const triggerMap: Record<string, { totalScore: number; count: number; energies: number[] }> = {};

    filteredLogs.forEach(log => {
      (log.triggers || []).forEach(trig => {
        if (!triggerMap[trig]) {
          triggerMap[trig] = { totalScore: 0, count: 0, energies: [] };
        }
        triggerMap[trig].totalScore += log.score;
        triggerMap[trig].count += 1;
        triggerMap[trig].energies.push(log.energyScore ?? 3);
      });
    });

    const list = Object.entries(triggerMap).map(([name, data]) => {
      const avg = Number((data.totalScore / data.count).toFixed(2));
      const diff = Number((avg - overallAvgMood).toFixed(2));
      const avgEnergy = Number((data.energies.reduce((a, b) => a + b, 0) / data.count).toFixed(1));
      return {
        name,
        count: data.count,
        avgMood: avg,
        diff,
        avgEnergy,
        isPositive: diff >= 0
      };
    });

    // Sort by impact (highest avg mood down to lowest)
    return list.sort((a, b) => b.avgMood - a.avgMood);
  }, [filteredLogs, overallAvgMood]);

  // Chart 3: Emotions Frequency Breakdown
  const emotionsBreakdownData = useMemo(() => {
    const emotionCounts: Record<string, { count: number; totalScore: number }> = {};
    filteredLogs.forEach(l => {
      (l.emotions || []).forEach(emo => {
        if (!emotionCounts[emo]) {
          emotionCounts[emo] = { count: 0, totalScore: 0 };
        }
        emotionCounts[emo].count += 1;
        emotionCounts[emo].totalScore += l.score;
      });
    });

    return Object.entries(emotionCounts)
      .map(([name, d]) => ({
        name,
        count: d.count,
        avgMood: Number((d.totalScore / d.count).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredLogs]);

  // Automated Pattern Insights based on Cross-Data
  const insights = useMemo(() => {
    if (filteredLogs.length < 3) return null;

    const positiveTriggers = triggerImpactData.filter(t => t.diff > 0.3 && t.count >= 2);
    const challengingTriggers = triggerImpactData.filter(t => t.diff < -0.3 && t.count >= 2);

    // Days with high mood (4 or 5)
    const highMoodLogs = filteredLogs.filter(l => l.score >= 4);
    const lowMoodLogs = filteredLogs.filter(l => l.score <= 2);

    const highTriggerFreq: Record<string, number> = {};
    highMoodLogs.forEach(l => (l.triggers || []).forEach(t => highTriggerFreq[t] = (highTriggerFreq[t] || 0) + 1));
    const topPositiveTrigger = Object.entries(highTriggerFreq).sort((a, b) => b[1] - a[1])[0];

    const lowTriggerFreq: Record<string, number> = {};
    lowMoodLogs.forEach(l => (l.triggers || []).forEach(t => lowTriggerFreq[t] = (lowTriggerFreq[t] || 0) + 1));
    const topLowTrigger = Object.entries(lowTriggerFreq).sort((a, b) => b[1] - a[1])[0];

    // Day of week analysis
    const dayOfWeekAvg: Record<number, { sum: number; count: number }> = {};
    filteredLogs.forEach(l => {
      const dayIdx = new Date(l.date + 'T12:00:00').getDay();
      if (!dayOfWeekAvg[dayIdx]) dayOfWeekAvg[dayIdx] = { sum: 0, count: 0 };
      dayOfWeekAvg[dayIdx].sum += l.score;
      dayOfWeekAvg[dayIdx].count += 1;
    });

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    let bestDayName = '';
    let bestDayAvg = 0;
    Object.entries(dayOfWeekAvg).forEach(([dayIdx, data]) => {
      const avg = data.sum / data.count;
      if (avg > bestDayAvg && data.count >= 1) {
        bestDayAvg = avg;
        bestDayName = dayNames[Number(dayIdx)];
      }
    });

    return {
      topPositiveTrigger: topPositiveTrigger ? topPositiveTrigger[0] : (positiveTriggers[0]?.name || null),
      topLowTrigger: topLowTrigger ? topLowTrigger[0] : (challengingTriggers[0]?.name || null),
      bestDayName,
      bestDayAvg: Number(bestDayAvg.toFixed(1)),
      positiveCount: highMoodLogs.length,
      lowCount: lowMoodLogs.length,
      energyCorrelation: overallAvgEnergy < 2.5 ? 'Bajo nivel de energía vinculado a días más desafiantes' : 'Energía equilibrada en la mayoría de tus registros'
    };
  }, [filteredLogs, triggerImpactData, overallAvgMood, overallAvgEnergy]);

  // Detection of Low Mood or Persistent Low Mood (for Social Intelligence & Resource Hub)
  const isLowMoodDetected = useMemo(() => {
    if (todayLog && todayLog.score <= 2) return true;
    const recentLowCount = filteredLogs.filter(l => l.score <= 2).length;
    if (recentLowCount >= 2) return true;
    if (filteredLogs.length >= 3 && overallAvgMood <= 2.6) return true;
    return false;
  }, [todayLog, filteredLogs, overallAvgMood]);

  // Custom Recharts Tooltip for Time Series
  const CustomTimeSeriesTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const moodObj = MOOD_SCALES.find(s => s.score === data.score);
      return (
        <div className="bg-stone-900 text-white p-3 rounded-xl shadow-xl text-xs border border-stone-700 max-w-xs">
          <div className="flex items-center justify-between gap-3 border-b border-stone-700 pb-1.5 mb-2 font-semibold">
            <span>{data.date}</span>
            <span className="text-amber-400 font-bold">{data.score}/5 • {moodObj?.label}</span>
          </div>
          <div className="space-y-1 text-stone-300">
            <p><strong className="text-white">Energía:</strong> {data.energy}/5</p>
            {data.emotions && (
              <p><strong className="text-white">Emociones:</strong> {data.emotions}</p>
            )}
            {data.triggers && (
              <p><strong className="text-white">Detonantes:</strong> {data.triggers}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Recharts Tooltip for Triggers Impact Bar Chart
  const CustomTriggerTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-stone-900 text-white p-3 rounded-xl shadow-xl text-xs border border-stone-700 max-w-xs">
          <p className="font-bold text-sm text-stone-100 mb-1">{d.name}</p>
          <div className="space-y-1 text-stone-300">
            <p>
              <strong className="text-white">Ánimo promedio:</strong>{' '}
              <span className={d.avgMood >= overallAvgMood ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {d.avgMood} / 5
              </span>
            </p>
            <p>
              <strong className="text-white">Diferencia vs promedio global:</strong>{' '}
              <span className={d.diff >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {d.diff >= 0 ? `+${d.diff}` : d.diff} pts
              </span>
            </p>
            <p><strong className="text-white">Frecuencia:</strong> {d.count} {d.count === 1 ? 'registro' : 'registros'}</p>
            <p><strong className="text-white">Energía asociada:</strong> {d.avgEnergy} / 5</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-stone-900">Seguimiento del Estado de Ánimo</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800">
              Mood Tracking
            </span>
          </div>
          <p className="text-stone-500 text-sm mt-1">
            Escalas emocionales, cruce de factores y detección de patrones a lo largo del tiempo.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {logs.length === 0 && !isLoading && (
            <button
              onClick={handleSeedSampleData}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 transition-colors"
              title="Cargar 13 días de registros de ejemplo para previsualizar los gráficos inmediatamente"
            >
              Cargar datos demo
            </button>
          )}

          <button
            onClick={() => openNewCheckin()}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 text-sm font-medium flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{todayLog ? 'Editar Check-in de Hoy' : 'Nuevo Check-in de Ánimo'}</span>
          </button>
        </div>
      </div>

      {/* Today's Quick Status Card if logged */}
      {todayLog && (
        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {(() => {
              const s = MOOD_SCALES.find(x => x.score === todayLog.score) || MOOD_SCALES[2];
              const Icon = s.icon;
              return (
                <div className={`w-12 h-12 rounded-2xl ${s.bgColor} ${s.borderColor} border flex items-center justify-center shrink-0 shadow-2xs`}>
                  <Icon className={`w-6 h-6 ${s.textColor}`} />
                </div>
              );
            })()}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">Ánimo Registrado Hoy</span>
                <span className="text-xs font-bold text-stone-900">
                  {MOOD_SCALES.find(s => s.score === todayLog.score)?.label} ({todayLog.score}/5)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(todayLog.emotions || []).map(emo => (
                  <span key={emo} className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-700 text-2xs font-medium">
                    {emo}
                  </span>
                ))}
                {(todayLog.triggers || []).map(trig => (
                  <span key={trig} className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-600 text-2xs font-medium">
                    • {trig}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => openNewCheckin(todayLog)}
            className="text-xs font-medium text-stone-700 hover:text-stone-950 flex items-center gap-1 self-end sm:self-center px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-1">
          <span className="text-xs font-medium text-stone-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-stone-700" />
            Ánimo Promedio
          </span>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-stone-900">{overallAvgMood || '--'}</p>
            <span className="text-xs text-stone-500">/ 5</span>
          </div>
          <p className="text-2xs text-stone-400">
            {overallAvgMood >= 3.8 ? 'Tendencia positiva' : overallAvgMood >= 2.8 ? 'Estable / equilibrado' : 'Período con retos'}
          </p>
        </div>

        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-1">
          <span className="text-xs font-medium text-stone-500 flex items-center gap-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-amber-600" />
            Nivel de Energía
          </span>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-stone-900">{overallAvgEnergy || '--'}</p>
            <span className="text-xs text-stone-500">/ 5</span>
          </div>
          <p className="text-2xs text-stone-400">Vitalidad promedio registrada</p>
        </div>

        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-1">
          <span className="text-xs font-medium text-stone-500 flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            Potenciador #1
          </span>
          <p className="text-sm font-bold text-stone-900 truncate">
            {insights?.topPositiveTrigger || triggerImpactData[0]?.name || 'Registrando...'}
          </p>
          <p className="text-2xs text-emerald-700 font-medium">Mayor impacto positivo</p>
        </div>

        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-1">
          <span className="text-xs font-medium text-stone-500 flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
            Detonante de Reto
          </span>
          <p className="text-sm font-bold text-stone-900 truncate">
            {insights?.topLowTrigger || triggerImpactData[triggerImpactData.length - 1]?.name || 'Identificando...'}
          </p>
          <p className="text-2xs text-rose-600 font-medium">Asociado a días difíciles</p>
        </div>
      </div>

      {/* Tabs & Range Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'charts' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Gráficos y Cruces
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'patterns' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Patrones y Hallazgos
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'support' 
                ? 'bg-amber-600 text-white shadow-xs' 
                : isLowMoodDetected 
                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300' 
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Apoyo y Recursos</span>
            {isLowMoodDetected && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-3xs font-bold uppercase tracking-wider">
                Atención
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'history' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Historial ({logs.length})
          </button>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-stone-400 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Rango:
          </span>
          {(['7d', '14d', '30d', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilterRange(r)}
              className={`px-2 py-1 rounded-md transition-colors ${
                filterRange === r ? 'bg-stone-200 text-stone-900 font-bold' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {r === '7d' ? '7 días' : r === '14d' ? '14 días' : r === '30d' ? '30 días' : 'Todo'}
            </button>
          ))}
        </div>
      </div>

      {/* Empathetic Notification Banner when low mood is detected and not on support tab */}
      {isLowMoodDetected && activeTab !== 'support' && (
        <div className="p-4 rounded-2xl bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Acompañamiento ante Bajas de Ánimo Detectadas
                </h4>
                <span className="px-2 py-0.2 rounded-full bg-amber-200 text-amber-900 text-2xs font-semibold">
                  Inteligencia Social
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                {todayLog && todayLog.score <= 2 
                  ? `Tu registro de hoy (${todayLog.score}/5) indica un momento difícil. El desánimo no se supera en soledad forzada.`
                  : 'Hemos detectado varios registros recientes con ánimo bajo o fatiga persistente en este período.'}
                {' '}Te sugerimos revisar la sección de Apoyo con consejos prácticos de Inteligencia Social, lecturas terapéuticas y conferencias de YouTube.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('support')}
            className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-xs transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ver Consejos y Recursos</span>
          </button>
        </div>
      )}

      {/* VIEW: CHARTS */}
      {activeTab === 'charts' && (
        <div className="space-y-8">
          {/* Chart 1: Time Series Area Chart */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Evolución Temporal del Ánimo y Energía
                </h3>
                <p className="text-xs text-stone-500">
                  Fluctuación diaria del estado de ánimo (escala 1 a 5) y nivel de energía.
                </p>
              </div>
              <div className="flex items-center gap-3 text-2xs font-medium text-stone-600">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Ánimo
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Energía
                </span>
              </div>
            </div>

            {timeSeriesData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-stone-400 text-sm border border-dashed border-stone-200 rounded-xl bg-stone-50">
                <Smile className="w-8 h-8 mb-2 text-stone-300" />
                <p>Aún no hay registros en este rango de fechas.</p>
                <button
                  onClick={() => openNewCheckin()}
                  className="mt-3 text-xs font-semibold text-stone-900 underline"
                >
                  Registrar primer check-in
                </button>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} />
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 11, fill: '#78716c' }} 
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[1, 5]} 
                      ticks={[1, 2, 3, 4, 5]} 
                      tick={{ fontSize: 11, fill: '#78716c' }} 
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTimeSeriesTooltip />} />
                    <ReferenceLine y={3} stroke="#e7e5e4" strokeDasharray="4 4" />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#059669" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#moodGradient)" 
                      dot={{ fill: '#059669', r: 4 }}
                      activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="energy" 
                      stroke="#d97706" 
                      strokeWidth={1.8} 
                      strokeDasharray="4 3"
                      fillOpacity={1} 
                      fill="url(#energyGradient)" 
                      dot={{ fill: '#d97706', r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Triggers Cross Analysis (Impact on Mood) */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-600" />
                  Cruce de Detonantes y Factores vs. Estado de Ánimo
                </h3>
                <p className="text-xs text-stone-500">
                  Muestra el promedio anímico que experimentas cuando cada detonante está presente. La línea central marca tu promedio global ({overallAvgMood}/5).
                </p>
              </div>
              <div className="flex items-center gap-2 text-2xs font-medium">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Verde: Potenciador ({'>'} Promedio)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                  Rojo/Naranja: Detonante de reto ({'<'} Promedio)
                </span>
              </div>
            </div>

            {triggerImpactData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-stone-400 text-sm border border-dashed border-stone-200 rounded-xl bg-stone-50">
                <p>Registra detonantes o factores en tus check-ins para visualizar su impacto cruzado.</p>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={triggerImpactData} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" horizontal={false} />
                    <XAxis 
                      type="number" 
                      domain={[1, 5]} 
                      ticks={[1, 2, 3, 4, 5]} 
                      tick={{ fontSize: 11, fill: '#78716c' }} 
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: '#44403c' }} 
                      width={120}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTriggerTooltip />} />
                    <ReferenceLine 
                      x={overallAvgMood} 
                      stroke="#78716c" 
                      strokeDasharray="3 3" 
                      label={{ 
                        value: `Promedio: ${overallAvgMood}`, 
                        fill: '#78716c', 
                        fontSize: 10, 
                        position: 'top' 
                      }} 
                    />
                    <Bar dataKey="avgMood" radius={[0, 6, 6, 0]}>
                      {triggerImpactData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.avgMood >= overallAvgMood ? '#10b981' : '#f43f5e'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 3: Emotions Frequency Breakdown */}
          {emotionsBreakdownData.length > 0 && (
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">Emociones más Frecuentes</h3>
                <p className="text-xs text-stone-500">
                  Frecuencia de las emociones registradas en tus check-ins.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {emotionsBreakdownData.map(item => (
                  <div key={item.name} className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 flex flex-col justify-between">
                    <span className="text-xs font-semibold text-stone-800 truncate">{item.name}</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-lg font-bold text-stone-900">{item.count}x</span>
                      <span className="text-2xs text-stone-500 font-medium">ánimo prom: {item.avgMood}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: PATTERNS & INSIGHTS */}
      {activeTab === 'patterns' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-linear-to-br from-stone-900 via-stone-850 to-stone-900 text-white border border-stone-800 space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Lightbulb className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-amber-200">
                Patrones y Correlaciones Detectadas
              </h3>
            </div>
            <p className="text-sm text-stone-300 leading-relaxed">
              Basado en el cruce de tus registros diarios, niveles de energía, emociones y detonantes seleccionados:
            </p>

            {insights ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {insights.topPositiveTrigger && (
                  <div className="p-4 rounded-xl bg-white/10 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Factor Protector Clave</span>
                    </div>
                    <p className="text-stone-200 text-xs leading-relaxed">
                      El factor <strong className="text-emerald-300">"{insights.topPositiveTrigger}"</strong> tiene la correlación más alta con tus días de mayor satisfacción y bienestar. Priorizar este hábito o contexto eleva notablemente tu promedio anímico.
                    </p>
                  </div>
                )}

                {insights.topLowTrigger && (
                  <div className="p-4 rounded-xl bg-white/10 border border-rose-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
                      <ArrowDownRight className="w-4 h-4" />
                      <span>Detonante de Vulnerabilidad</span>
                    </div>
                    <p className="text-stone-200 text-xs leading-relaxed">
                      Cuando <strong className="text-rose-300">"{insights.topLowTrigger}"</strong> está presente, sueles reportar un estado anímico más bajo o mayor agotamiento. Puede ser una señal para establecer límites o incorporar pausas conscientes en esos días.
                    </p>
                  </div>
                )}

                {insights.bestDayName && (
                  <div className="p-4 rounded-xl bg-white/10 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>Día de Mayor Bienestar</span>
                    </div>
                    <p className="text-stone-200 text-xs leading-relaxed">
                      Los <strong className="text-amber-200">{insights.bestDayName}s</strong> han registrado tu promedio más alto de la semana ({insights.bestDayAvg} / 5).
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-white/10 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-teal-300 font-semibold text-sm">
                    <BatteryCharging className="w-4 h-4" />
                    <span>Energía y Vitalidad</span>
                  </div>
                  <p className="text-stone-200 text-xs leading-relaxed">
                    {insights.energyCorrelation}. Tu nivel promedio de energía es de <strong className="text-teal-200">{overallAvgEnergy}/5</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-stone-400 text-xs border border-white/10 rounded-xl">
                Se necesitan al menos 3 registros con etiquetas de detonantes para calcular patrones predictivos con precisión.
              </div>
            )}
          </div>

          {/* Detailed Triggers Matrix Table */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              Tabla Cruzada: Detonantes vs. Impacto Anímico
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Detonante / Factor</th>
                    <th className="py-2.5 px-3">Frecuencia</th>
                    <th className="py-2.5 px-3">Ánimo Promedio</th>
                    <th className="py-2.5 px-3">Diferencia vs Global ({overallAvgMood})</th>
                    <th className="py-2.5 px-3">Energía Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {triggerImpactData.map(item => (
                    <tr key={item.name} className="hover:bg-stone-50/50">
                      <td className="py-2.5 px-3 font-semibold text-stone-900">{item.name}</td>
                      <td className="py-2.5 px-3">{item.count} {item.count === 1 ? 'vez' : 'veces'}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold">{item.avgMood}</span> / 5
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-2xs ${
                          item.diff >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.diff >= 0 ? `+${item.diff}` : item.diff} pts
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{item.avgEnergy} / 5</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-stone-900">Historial Cronológico de Registros</h3>
            
            {/* Filter by trigger */}
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={filterTrigger}
                onChange={e => setFilterTrigger(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
              >
                <option value="all">Todos los detonantes</option>
                {Array.from(new Set(logs.flatMap(l => l.triggers || []))).map(trig => (
                  <option key={trig} value={trig}>{trig}</option>
                ))}
              </select>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-sm border border-dashed border-stone-200 rounded-xl bg-stone-50">
              No tienes registros de estado de ánimo aún.
            </div>
          ) : (
            <div className="space-y-3">
              {[...logs]
                .filter(l => filterTrigger === 'all' || (l.triggers || []).includes(filterTrigger))
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(log => {
                  const scaleObj = MOOD_SCALES.find(s => s.score === log.score) || MOOD_SCALES[2];
                  const Icon = scaleObj.icon;
                  const formattedLogDate = new Date(log.date + 'T12:00:00').toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  });

                  return (
                    <div 
                      key={log.id} 
                      className="p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-all shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl ${scaleObj.bgColor} ${scaleObj.borderColor} border flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${scaleObj.textColor}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-stone-900 capitalize">{formattedLogDate}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${scaleObj.bgColor} ${scaleObj.textColor}`}>
                                {scaleObj.label} ({log.score}/5)
                              </span>
                            </div>
                            <span className="text-2xs text-stone-500">Energía: {log.energyScore ?? 3}/5</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openNewCheckin(log)}
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Emotions tags */}
                      {log.emotions && log.emotions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-2xs font-medium text-stone-400">Emociones:</span>
                          {log.emotions.map(emo => (
                            <span key={emo} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-2xs font-medium border border-stone-200">
                              {emo}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Triggers tags */}
                      {log.triggers && log.triggers.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-2xs font-medium text-stone-400">Detonantes:</span>
                          {log.triggers.map(trig => (
                            <span key={trig} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-2xs font-medium border border-amber-200">
                              {trig}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {log.notes && (
                        <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100 italic">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: SUPPORT & SOCIAL INTELLIGENCE RESOURCES */}
      {activeTab === 'support' && (
        <MoodSupportGuidanceSection
          logs={filteredLogs}
          todayLog={todayLog}
          overallAvgMood={overallAvgMood}
          overallAvgEnergy={overallAvgEnergy}
          insights={insights}
          isLowMoodDetected={isLowMoodDetected}
        />
      )}

      {/* MODAL: CHECK-IN / REGISTRO DE ÁNIMO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 my-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  {editId ? 'Editar Registro de Ánimo' : '¿Cómo te sientes en este momento?'}
                </h3>
                <p className="text-xs text-stone-500">
                  Check-in emocional y registro de factores detonantes.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Date selection */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha del registro</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  required
                />
              </div>

              {/* Scale 1 to 5 */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-2">
                  1. Escala de Estado de Ánimo (1 a 5)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {MOOD_SCALES.map(scale => {
                    const Icon = scale.icon;
                    const isSelected = formScore === scale.score;
                    return (
                      <button
                        type="button"
                        key={scale.score}
                        onClick={() => setFormScore(scale.score)}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? `${scale.bgColor} ${scale.borderColor} ring-2 ring-stone-900 shadow-xs scale-102`
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${scale.textColor}`} />
                        <span className="text-2xs font-bold text-stone-900">{scale.score}</span>
                        <span className="text-3xs font-medium text-stone-500 leading-tight">{scale.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Energy Scale 1 to 5 */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-stone-700">
                    2. Nivel de Energía y Vitalidad
                  </label>
                  <span className="text-xs font-bold text-amber-800">
                    {formEnergy === 1 ? 'Agotado (1/5)' : formEnergy === 2 ? 'Poca energía (2/5)' : formEnergy === 3 ? 'Estable (3/5)' : formEnergy === 4 ? 'Buena energía (4/5)' : 'Muy alta energía (5/5)'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setFormEnergy(lvl)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        formEnergy === lvl
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emotions tags */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  3. ¿Qué emociones sientes? (Selecciona una o más)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-200">
                  {availableEmotions.map(emo => {
                    const isSelected = formEmotions.includes(emo);
                    return (
                      <button
                        type="button"
                        key={emo}
                        onClick={() => handleToggleEmotion(emo)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-stone-900 text-white shadow-2xs'
                            : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {emo}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5 mt-2">
                  <input
                    type="text"
                    value={customEmotionInput}
                    onChange={e => setCustomEmotionInput(e.target.value)}
                    placeholder="Otra emoción..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomEmotion();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomEmotion}
                    className="px-3 py-1.5 text-xs rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 font-medium"
                  >
                    Añadir
                  </button>
                </div>
              </div>

              {/* Triggers / Factors tags */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  4. Detonantes y Factores (¿Qué influyó en tu ánimo hoy?)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-200">
                  {availableTriggers.map(trig => {
                    const isSelected = formTriggers.includes(trig);
                    return (
                      <button
                        type="button"
                        key={trig}
                        onClick={() => handleToggleTrigger(trig)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {trig}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5 mt-2">
                  <input
                    type="text"
                    value={customTriggerInput}
                    onChange={e => setCustomTriggerInput(e.target.value)}
                    placeholder="Otro factor o detonante..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTrigger();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTrigger}
                    className="px-3 py-1.5 text-xs rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 font-medium"
                  >
                    Añadir
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  5. Breve reflexión o notas (opcional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="¿Qué eventos o pensamientos destacaron hoy?"
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Guardando...' : editId ? 'Actualizar Registro' : 'Guardar Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
