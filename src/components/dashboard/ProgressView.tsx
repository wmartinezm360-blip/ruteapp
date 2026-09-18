import { useState, useEffect } from 'react';
import { getGoals, getActivityLogs, getMoodLogs } from '../../lib/firestoreService';
import { Smile, TrendingUp } from 'lucide-react';

export default function ProgressView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [moodLogs, setMoodLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsData, goalsData, moodData] = await Promise.all([
          getActivityLogs(),
          getGoals(),
          getMoodLogs(60)
        ]);

        setLogs(logsData || []);
        setGoals(goalsData || []);
        setMoodLogs(moodData || []);
      } catch (err) {
        console.error('Error fetching progress data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute stats dynamically from real logs
  const completedLogs = logs.filter(l => l.goalId);
  const uniqueDays = new Set(logs.map(l => l.date)).size;

  const avgMood = moodLogs.length > 0 
    ? (moodLogs.reduce((acc, m) => acc + (m.score || 0), 0) / moodLogs.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Progreso Integral</h2>
        <p className="text-stone-500 text-xs sm:text-sm">Resumen y métricas de tus hábitos completados y bienestar.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        <div className="bg-stone-50 p-4 sm:p-6 rounded-2xl border border-stone-100">
          <h3 className="text-xs sm:text-sm font-semibold text-stone-600 mb-1.5 sm:mb-2">Días Activos</h3>
          <p className="text-2xl sm:text-3xl font-bold text-stone-900">{uniqueDays}</p>
          <p className="text-2xs sm:text-xs text-stone-500 mt-1">Días con registros completados</p>
        </div>
        <div className="bg-stone-50 p-4 sm:p-6 rounded-2xl border border-stone-100">
          <h3 className="text-xs sm:text-sm font-semibold text-stone-600 mb-1.5 sm:mb-2">Actividades Realizadas</h3>
          <p className="text-2xl sm:text-3xl font-bold text-stone-900">{completedLogs.length}</p>
          <p className="text-2xs sm:text-xs text-stone-500 mt-1">Total de check-ins de metas</p>
        </div>
        <div className="bg-amber-50/60 p-4 sm:p-6 rounded-2xl border border-amber-200/70">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <h3 className="text-xs sm:text-sm font-semibold text-amber-900">Ánimo Promedio</h3>
            <Smile className="w-4 h-4 text-amber-700" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-900">
            {avgMood ? `${avgMood}/5` : '—'}
          </p>
          <p className="text-2xs sm:text-xs text-amber-800 mt-1">
            {moodLogs.length > 0 ? `${moodLogs.length} registros de ánimo` : 'Sin registros de ánimo aún'}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Progreso por Meta</h3>
        {goals.length === 0 ? (
          <p className="text-stone-400 text-sm italic">No hay metas registradas aún.</p>
        ) : (
          <div className="space-y-4">
            {goals.map(goal => {
              const count = logs.filter(l => l.goalId === goal.id).length;
              return (
                <div key={goal.id} className="space-y-1 bg-stone-50 p-3 rounded-lg border border-stone-100">
                  <div className="flex justify-between text-sm font-medium text-stone-800">
                    <span>{goal.text}</span>
                    <span>{count} check-ins</span>
                  </div>
                  <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-stone-800 h-2 rounded-full transition-all" 
                      style={{ width: `${Math.min(100, count * 10)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
