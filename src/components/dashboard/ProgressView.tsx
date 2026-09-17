import { useState, useEffect } from 'react';
import { getGoals, getActivityLogs } from '../../lib/firestoreService';

export default function ProgressView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsData, goalsData] = await Promise.all([
          getActivityLogs(),
          getGoals()
        ]);

        setLogs(logsData || []);
        setGoals(goalsData || []);
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Progreso</h2>
        <p className="text-stone-600">Resumen y métricas de tus hábitos completados.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-stone-50 p-6 rounded-xl border border-stone-100">
          <h3 className="text-lg font-medium mb-4">Días Activos</h3>
          <p className="text-4xl font-bold text-stone-900">{uniqueDays}</p>
          <p className="text-sm text-stone-600">Días con registros completados</p>
        </div>
        <div className="bg-stone-50 p-6 rounded-xl border border-stone-100">
          <h3 className="text-lg font-medium mb-4">Actividades Realizadas</h3>
          <p className="text-4xl font-bold text-stone-900">{completedLogs.length}</p>
          <p className="text-sm text-stone-600">Total de check-ins registrados</p>
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
