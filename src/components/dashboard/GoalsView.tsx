import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { getGoals, createGoal } from '../../lib/firestoreService';

export type GoalType = 'habito' | 'pequena' | 'mediana' | 'grande';

export interface Goal {
  id: string;
  text: string;
  type: GoalType;
  parentId?: string;
  completed: boolean;
  createdAt: number;
}

export default function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalType, setNewGoalType] = useState<GoalType>('grande');
  const [newGoalParentId, setNewGoalParentId] = useState<string>('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const data = await getGoals();
      setGoals(data as Goal[] || []);
    } catch (err) {
      console.error('Error fetching goals:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleAddGoal = async () => {
    if (!newGoalText.trim()) return;
    setIsSubmitting(true);
    try {
      const addedGoal = await createGoal(
        newGoalText.trim(),
        newGoalType,
        newGoalParentId || null
      );
      setGoals(prev => [...prev, addedGoal as any]);
      setNewGoalText('');
    } catch (err) {
      console.error('Error adding goal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const goalsByParent = goals.reduce((acc, goal) => {
    const pId = goal.parentId || 'root';
    if (!acc[pId]) acc[pId] = [];
    acc[pId].push(goal);
    return acc;
  }, {} as Record<string, Goal[]>);

  const getValidParents = (type: GoalType) => {
    // Only allow parents that are "bigger" than the current type
    if (type === 'grande') return [];
    if (type === 'mediana') return goals.filter(g => g.type === 'grande');
    if (type === 'pequena') return goals.filter(g => g.type === 'mediana' || g.type === 'grande');
    if (type === 'habito') return goals.filter(g => g.type !== 'habito');
    return [];
  };

  const typeColors: Record<GoalType, string> = {
    grande: 'bg-stone-200 text-stone-800',
    mediana: 'bg-stone-100 text-stone-700',
    pequena: 'bg-white border border-stone-200 text-stone-600',
    habito: 'bg-stone-50 border border-stone-100 text-stone-600'
  };

  const typeLabels: Record<GoalType, string> = {
    grande: 'Meta Grande',
    mediana: 'Meta Mediana',
    pequena: 'Meta Pequeña',
    habito: 'Hábito Diario'
  };

  const renderGoalNode = (goal: Goal, depth: number = 0) => {
    const children = goalsByParent[goal.id] || [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded[goal.id];

    return (
      <div key={goal.id} className="mt-2" style={{ marginLeft: depth > 0 ? '1.5rem' : '0' }}>
        <div 
          className={`p-3 rounded-lg flex items-center justify-between ${typeColors[goal.type]} shadow-sm transition-all`}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button onClick={() => toggleExpand(goal.id)} className="p-1 hover:bg-black/5 rounded">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <span className="w-6" /> // spacer
            )}
            <span className="font-medium">{goal.text}</span>
            <span className="text-xs uppercase tracking-wider opacity-60 ml-2">
              {typeLabels[goal.type]}
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l-2 border-stone-200 ml-4 pl-2 mt-2 space-y-2">
            {children.map(child => renderGoalNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const validParents = getValidParents(newGoalType);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Mis Metas</h2>
        <p className="text-stone-600">Estructura tus grandes objetivos en pequeños hábitos manejables.</p>
      </div>
      
      <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
        <h3 className="font-medium text-stone-800 flex items-center gap-2">
          <Plus size={18} /> Añadir Nueva
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input 
            type="text" 
            value={newGoalText}
            onChange={(e) => setNewGoalText(e.target.value)}
            placeholder="Título de la meta o hábito..."
            className="md:col-span-3 p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400 bg-white"
          />
          
          <select 
            value={newGoalType}
            onChange={(e) => {
              setNewGoalType(e.target.value as GoalType);
              setNewGoalParentId(''); // Reset parent when type changes
            }}
            className="p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400 bg-white"
          >
            <option value="grande">Meta Grande</option>
            <option value="mediana">Meta Mediana</option>
            <option value="pequena">Meta Pequeña</option>
            <option value="habito">Hábito Diario</option>
          </select>

          <select 
            value={newGoalParentId}
            onChange={(e) => setNewGoalParentId(e.target.value)}
            disabled={validParents.length === 0}
            className="md:col-span-2 p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400 bg-white disabled:bg-stone-100 disabled:text-stone-400"
          >
            <option value="">Sin meta padre (independiente)</option>
            {validParents.map(parent => (
              <option key={parent.id} value={parent.id}>
                Anidar bajo: {parent.text} ({typeLabels[parent.type]})
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-end">
          <button 
            onClick={handleAddGoal} 
            disabled={!newGoalText.trim()}
            className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            Añadir a la lista
          </button>
        </div>
      </div>

      <div className="pt-4">
        <h3 className="font-medium text-stone-800 mb-4">Tu Jerarquía de Metas</h3>
        {goals.length === 0 ? (
          <p className="text-stone-500 italic text-sm">No has creado ninguna meta aún. ¡Empieza con una Meta Grande!</p>
        ) : (
          <div className="space-y-2">
            {(goalsByParent['root'] || []).map(goal => renderGoalNode(goal, 0))}
          </div>
        )}
      </div>
    </div>
  );
}
