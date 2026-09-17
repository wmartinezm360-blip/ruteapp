import { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Lightbulb, 
  RefreshCw, 
  MessageSquare, 
  CheckCircle2, 
  Circle, 
  Flame, 
  ArrowRight, 
  Loader2, 
  Smile, 
  TrendingUp, 
  BarChart2, 
  Plus,
  HeartHandshake,
  BookOpen
} from 'lucide-react';
import { getGoals, getActivityLogs, addActivityLog, deleteActivityLog, getMoodLogs, saveMoodLog } from '../../lib/firestoreService';
import { auth } from '../../lib/firebase';
import { getDecryptedProfileFromLocal, buildMotivationalContext } from '../../lib/userProfileContext';
import { MOOD_SCALES } from './MoodTrackerView';
import { MoodLog } from '../../types';

interface Goal {
  id: string;
  text: string;
  type?: string;
}

interface DailyMotivation {
  greeting: string;
  message: string;
  tip: string;
  date: string;
}

interface TodayViewProps {
  onNavigateToChat?: () => void;
  onNavigateToMood?: (tab?: 'charts' | 'patterns' | 'support' | 'history') => void;
}

export default function TodayView({ onNavigateToChat, onNavigateToMood }: TodayViewProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completedGoalsMap, setCompletedGoalsMap] = useState<Record<string, string>>({}); // goalId -> logDocId
  const [streakDays, setStreakDays] = useState(0);
  const [todayMood, setTodayMood] = useState<MoodLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Daily motivation state
  const [dailyMotivation, setDailyMotivation] = useState<DailyMotivation | null>(null);
  const [loadingMotivation, setLoadingMotivation] = useState(false);

  // Local timezone date string YYYY-MM-DD
  const todayStr = new Date().toLocaleDateString('en-CA');
  const formattedTodayDate = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  const calculateStreak = (logs: Array<{ date: string }>): number => {
    if (!logs || logs.length === 0) return 0;
    const uniqueDates = Array.from(new Set(logs.map(l => l.date))).sort().reverse();
    const hasToday = uniqueDates.includes(todayStr);
    
    let streak = 0;
    const checkDate = new Date();
    if (!hasToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
      const dStr = checkDate.toLocaleDateString('en-CA');
      if (uniqueDates.includes(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const loadMotivation = useCallback(async (
    currentGoals: Goal[], 
    currentCompletedMap: Record<string, string>, 
    currentStreak: number, 
    currentMood: MoodLog | null,
    forceRefresh = false
  ) => {
    const user = auth.currentUser;
    if (!user) return;

    const cacheKey = `ruta_daily_motivation_${user.uid}_${todayStr}`;
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.date === todayStr) {
            setDailyMotivation(parsed);
            return;
          }
        } catch {
          // ignore cache parse error
        }
      }
    }

    setLoadingMotivation(true);
    try {
      const profile = getDecryptedProfileFromLocal(user.uid);
      const token = await user.getIdToken();
      
      const moodScaleObj = currentMood ? MOOD_SCALES.find(s => s.score === currentMood.score) : null;
      const context = buildMotivationalContext({
        profileAnswers: profile,
        goals: currentGoals,
        completedGoalIds: Object.keys(currentCompletedMap),
        streakDays: currentStreak,
        todayMood: currentMood ? {
          score: currentMood.score,
          label: moodScaleObj?.label,
          energyScore: currentMood.energyScore,
          emotions: currentMood.emotions,
          triggers: currentMood.triggers,
          notes: currentMood.notes
        } : null
      });

      const response = await fetch('/api/daily-motivation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          context,
          date: todayStr
        })
      });

      if (response.ok) {
        const data = await response.json();
        const motivationData: DailyMotivation = {
          greeting: data.greeting || '¡Hola! Un nuevo día para avanzar a tu ritmo',
          message: data.message || 'Cada pequeño paso que das con intención te acerca a tus metas.',
          tip: data.tip || 'Elige una acción clara para hoy y enfócate en cumplirla con calma.',
          date: todayStr
        };
        setDailyMotivation(motivationData);
        localStorage.setItem(cacheKey, JSON.stringify(motivationData));
      }
    } catch (err) {
      console.warn('Could not fetch daily motivation:', err);
    } finally {
      setLoadingMotivation(false);
    }
  }, [todayStr]);

  const fetchData = useCallback(async () => {
    try {
      const [goalsData, logsData, allLogsData, moodLogsData] = await Promise.all([
        getGoals(),
        getActivityLogs(todayStr),
        getActivityLogs(),
        getMoodLogs(30)
      ]);

      const goalsList = ((goalsData as any) || []) as Goal[];
      setGoals(goalsList);
      
      const mapping: Record<string, string> = {};
      (logsData || []).forEach((log: any) => {
        mapping[log.goalId] = log.id;
      });
      setCompletedGoalsMap(mapping);

      const calculatedStreak = calculateStreak((allLogsData as any) || []);
      setStreakDays(calculatedStreak);

      const foundMood = (moodLogsData || []).find((m: any) => m.date === todayStr) || null;
      setTodayMood(foundMood as MoodLog | null);

      // Load or generate daily motivation using real context and mood
      await loadMotivation(goalsList, mapping, calculatedStreak, foundMood as MoodLog | null);
    } catch (err) {
      console.error('Error fetching today data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [todayStr, loadMotivation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleQuickMoodSelect = async (score: number) => {
    try {
      const saved = await saveMoodLog({
        id: todayMood?.id,
        date: todayStr,
        score,
        energyScore: todayMood?.energyScore ?? 3,
        emotions: todayMood?.emotions || [],
        triggers: todayMood?.triggers || [],
        notes: todayMood?.notes || ''
      });
      setTodayMood(saved as MoodLog);
      // Refresh motivation in background
      loadMotivation(goals, completedGoalsMap, streakDays, saved as MoodLog, true);
    } catch (err) {
      console.error('Error saving quick mood:', err);
    }
  };

  const handleToggleCompleted = async (goalId: string) => {
    const logDocId = completedGoalsMap[goalId];
    
    if (logDocId) {
      setCompletedGoalsMap(prev => {
        const next = { ...prev };
        delete next[goalId];
        return next;
      });
      try {
        await deleteActivityLog(logDocId);
      } catch {
        fetchData();
      }
    } else {
      const tempId = `temp_${Date.now()}`;
      setCompletedGoalsMap(prev => ({ ...prev, [goalId]: tempId }));
      try {
        const newLog = await addActivityLog(goalId, todayStr);
        setCompletedGoalsMap(prev => ({ ...prev, [goalId]: newLog.id }));
      } catch {
        fetchData();
      }
    }
  };

  const totalGoalsCount = goals.length;
  const completedCount = Object.keys(completedGoalsMap).length;
  const progressPercent = totalGoalsCount > 0 ? Math.round((completedCount / totalGoalsCount) * 100) : 0;

  const currentScale = todayMood ? MOOD_SCALES.find(s => s.score === todayMood.score) || MOOD_SCALES[2] : null;

  return (
    <div className="space-y-6">
      {/* Header section with streak */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 capitalize">{formattedTodayDate}</h2>
          <p className="text-stone-500 text-sm">Tu espacio de enfoque diario, hábitos y estado de ánimo.</p>
        </div>

        {streakDays > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-full text-xs font-semibold self-start sm:self-auto shadow-xs">
            <Flame className="w-4 h-4 text-amber-600 fill-amber-500" />
            <span>{streakDays} {streakDays === 1 ? 'día de racha' : 'días de racha activa'}</span>
          </div>
        )}
      </div>

      {/* Mood Quick Check-in Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-stone-900">
              ¿Cómo te sientes hoy? (Mood Check-in)
            </h3>
          </div>
          {onNavigateToMood && (
            <button
              onClick={() => onNavigateToMood('charts')}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Ver Gráficos y Patrones</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 1 to 5 Mood Scale buttons */}
        <div className="grid grid-cols-5 gap-2 pt-1">
          {MOOD_SCALES.map(scale => {
            const Icon = scale.icon;
            const isSelected = todayMood?.score === scale.score;
            return (
              <button
                key={scale.score}
                onClick={() => handleQuickMoodSelect(scale.score)}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  isSelected 
                    ? `${scale.bgColor} ${scale.borderColor} ring-2 ring-stone-900 shadow-xs scale-102` 
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-600'
                }`}
                title={`${scale.label} (${scale.score}/5): ${scale.sublabel}`}
              >
                <Icon className={`w-5 h-5 ${scale.textColor}`} />
                <span className="text-xs font-bold text-stone-900">{scale.score}</span>
                <span className="text-3xs font-medium text-stone-500 hidden sm:inline leading-none truncate max-w-full">
                  {scale.label}
                </span>
              </button>
            );
          })}
        </div>

        {todayMood && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-stone-500">Estado:</span>
              <span className={`font-semibold px-2 py-0.5 rounded-md ${currentScale?.bgColor} ${currentScale?.textColor}`}>
                {currentScale?.label} ({todayMood.score}/5)
              </span>
              {todayMood.triggers && todayMood.triggers.length > 0 && (
                <span className="text-stone-500 hidden sm:inline">
                  • Detonantes: <strong className="text-stone-700">{todayMood.triggers.slice(0, 2).join(', ')}</strong>
                </span>
              )}
            </div>

            {onNavigateToMood && (
              <button
                onClick={() => onNavigateToMood('charts')}
                className="text-stone-600 hover:text-stone-900 underline font-medium text-2xs"
              >
                Editar etiquetas y detonantes
              </button>
            )}
          </div>
        )}
      </div>

      {/* Low Mood Social Intelligence Support Alert */}
      {todayMood && todayMood.score <= 2 && (
        <div className="p-4 rounded-2xl bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-800">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-amber-950 text-xs">
                  Acompañamiento con Inteligencia Social
                </p>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-3xs font-semibold uppercase">
                  Ánimo Bajo ({todayMood.score}/5)
                </span>
              </div>
              <p className="text-amber-900/90 text-2xs mt-0.5 leading-relaxed">
                El desánimo tiende a inducir aislamiento y autojuicio. Hemos preparado consejos prácticos de conexión relacional, lecturas reseñadas y videos de YouTube para acompañarte.
              </p>
            </div>
          </div>
          {onNavigateToMood && (
            <button
              onClick={() => onNavigateToMood('support')}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl text-xs shrink-0 self-start sm:self-auto flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ver Consejos y Recursos</span>
            </button>
          )}
        </div>
      )}

      {/* Automatic Daily Motivational Card */}
      <div className="p-5 rounded-2xl bg-linear-to-br from-stone-900 via-stone-850 to-stone-900 text-white shadow-md relative overflow-hidden border border-stone-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-amber-400">
              Mensaje del Día • Asistente Ruta
            </span>
          </div>

          <button
            onClick={() => loadMotivation(goals, completedGoalsMap, streakDays, todayMood, true)}
            disabled={loadingMotivation}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Generar nueva reflexión para hoy"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMotivation ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {loadingMotivation && !dailyMotivation ? (
          <div className="py-6 flex items-center gap-3 text-stone-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Personalizando tu motivación diaria con base en tu perfil, ánimo y metas...</span>
          </div>
        ) : dailyMotivation ? (
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-amber-200">
              {dailyMotivation.greeting}
            </h3>
            <p className="text-stone-200 text-sm leading-relaxed">
              {dailyMotivation.message}
            </p>

            {dailyMotivation.tip && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-stone-100 text-xs border border-white/10">
                <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span><strong className="text-amber-200 font-semibold">Tip de enfoque:</strong> {dailyMotivation.tip}</span>
              </div>
            )}

            {onNavigateToChat && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={onNavigateToChat}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Profundizar en el chat con el Asistente</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-stone-300 text-sm py-2">
            ¡Bienvenido/a! Establece tus objetivos de hoy y mantente conectado con tu propósito.
          </p>
        )}
      </div>

      {/* Daily Progress Meter */}
      {totalGoalsCount > 0 && (
        <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-stone-700">Progreso de hoy</span>
            <span className="font-semibold text-stone-900">{completedCount} de {totalGoalsCount} completadas ({progressPercent}%)</span>
          </div>
          <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-stone-900 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Goals List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-stone-900">Objetivos del Día</h3>
          <span className="text-xs text-stone-500 font-medium">
            {completedCount}/{totalGoalsCount} hechos
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-stone-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
            <span>Cargando tus metas activas...</span>
          </div>
        ) : goals.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-stone-200 text-center bg-stone-50 space-y-2">
            <p className="text-stone-700 font-medium">Aún no tienes metas registradas</p>
            <p className="text-stone-500 text-sm max-w-sm mx-auto">
              Ve a la sección "Mis Metas" para agregar tus primeros hábitos o metas y comenzar a registrar tu progreso real.
            </p>
          </div>
        ) : (
          goals.map(goal => {
            const isCompleted = !!completedGoalsMap[goal.id];
            return (
              <div 
                key={goal.id} 
                className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-200 ${
                  isCompleted 
                    ? 'bg-stone-100/70 border-stone-200 text-stone-400' 
                    : 'bg-white border-stone-200 text-stone-800 shadow-2xs hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleCompleted(goal.id)}
                    className={`transition-colors ${isCompleted ? 'text-emerald-600' : 'text-stone-300 hover:text-stone-500'}`}
                    title={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 fill-emerald-100" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <span className={`text-sm md:text-base font-medium ${isCompleted ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                    {goal.text}
                  </span>
                </div>

                <button 
                  onClick={() => handleToggleCompleted(goal.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isCompleted 
                      ? 'bg-stone-200 text-stone-600 hover:bg-stone-300' 
                      : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  {isCompleted ? 'Deshacer' : 'Completar'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
