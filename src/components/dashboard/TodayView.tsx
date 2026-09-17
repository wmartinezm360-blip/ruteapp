import { useState, useEffect, useCallback } from 'react';
import { getGoals, getActivityLogs, addActivityLog, deleteActivityLog } from '../../lib/firestoreService';

interface Goal {
  id: string;
  text: string;
}

export default function TodayView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completedGoalsMap, setCompletedGoalsMap] = useState<Record<string, string>>({}); // goalId -> logDocId
  const [isLoading, setIsLoading] = useState(true);

  // Use local timezone date string YYYY-MM-DD for grouping
  const todayStr = new Date().toLocaleDateString('en-CA'); 

  const fetchData = useCallback(async () => {
    try {
      const [goalsData, logsData] = await Promise.all([
        getGoals(),
        getActivityLogs(todayStr)
      ]);

      setGoals((goalsData as any) || []);
      
      const mapping: Record<string, string> = {};
      (logsData || []).forEach((log: any) => {
        mapping[log.goalId] = log.id;
      });
      setCompletedGoalsMap(mapping);
    } catch (err) {
      console.error('Error fetching today data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleCompleted = async (goalId: string) => {
    const logDocId = completedGoalsMap[goalId];
    
    // Optimistic UI update
    if (logDocId) {
      setCompletedGoalsMap(prev => {
        const next = { ...prev };
        delete next[goalId];
        return next;
      });
      try {
        await deleteActivityLog(logDocId);
      } catch {
        fetchData(); // Rollback on error
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Hoy</h2>
        <p className="text-stone-600">Tus objetivos para este día.</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-stone-400">Cargando tus metas...</p>
        ) : goals.length === 0 ? (
          <p className="text-stone-500 italic">No tienes metas configuradas. Ve a "Mis Metas" para empezar.</p>
        ) : (
          goals.map(goal => {
            const isCompleted = !!completedGoalsMap[goal.id];
            return (
              <div 
                key={goal.id} 
                className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                  isCompleted ? 'bg-stone-100 border-stone-200' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <span className={`text-lg ${isCompleted ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                  {goal.text}
                </span>
                <button 
                  onClick={() => handleToggleCompleted(goal.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
