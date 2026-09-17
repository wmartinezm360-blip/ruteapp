import { useState, useRef, useEffect, useCallback } from 'react';
import Markdown from 'react-markdown';
import { LifeBuoy, Send, Bot, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { getGoals, getActivityLogs, getMoodLogs } from '../../lib/firestoreService';
import { getDecryptedProfileFromLocal, buildMotivationalContext } from '../../lib/userProfileContext';
import { MoodLog } from '../../types';
import { MOOD_SCALES } from './MoodTrackerView';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface Goal {
  id: string;
  text: string;
}

export default function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Real user goals and profiling state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completedGoalIds, setCompletedGoalIds] = useState<string[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [todayMood, setTodayMood] = useState<MoodLog | null>(null);
  const [profileSummaryText, setProfileSummaryText] = useState('');
  const [contextLoaded, setContextLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const todayStr = new Date().toLocaleDateString('en-CA');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load real user goals, completed logs, and questionnaire profile
  const loadUserContext = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const [goalsData, todayLogsData, allLogsData, moodLogsData] = await Promise.all([
        getGoals(),
        getActivityLogs(todayStr),
        getActivityLogs(),
        getMoodLogs(30)
      ]);

      const goalsList = ((goalsData as any) || []) as Goal[];
      const completedIds = (todayLogsData || []).map((l: any) => l.goalId);
      setGoals(goalsList);
      setCompletedGoalIds(completedIds);

      const foundMood = (moodLogsData || []).find((m: any) => m.date === todayStr) || null;
      setTodayMood(foundMood as MoodLog | null);

      // Calculate streak
      const uniqueDates = Array.from(new Set((allLogsData || []).map((l: any) => l.date))).sort().reverse();
      const hasToday = uniqueDates.includes(todayStr);
      let streak = 0;
      const checkDate = new Date();
      if (!hasToday) checkDate.setDate(checkDate.getDate() - 1);
      for (let i = 0; i < 365; i++) {
        const dStr = checkDate.toLocaleDateString('en-CA');
        if (uniqueDates.includes(dStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      setStreakDays(streak);

      const profile = getDecryptedProfileFromLocal(user.uid);
      
      // Build initial proactive greeting message if no messages yet
      if (messages.length === 0) {
        let initialGreeting = '¡Hola! Qué gusto saludarte. ';
        if (foundMood && foundMood.score <= 2) {
          const triggerText = foundMood.triggers && foundMood.triggers.length > 0 ? ` (detonantes: ${foundMood.triggers.join(', ')})` : '';
          initialGreeting = `Hola. Veo que hoy registraste un nivel de ánimo bajo (${foundMood.score}/5${triggerText}). Recuerda que el desánimo no se supera forzándote ni aislándote; la inteligencia social nos recuerda que la vulnerabilidad compartida y el descanso son válidos. Puedo orientarte con lecturas recomendadas, videos de YouTube o micro-pasos para aliviar la carga hoy. ¿Cómo te sientes en este momento?`;
        } else if (goalsList.length > 0) {
          const completedCount = completedIds.filter(id => goalsList.some(g => g.id === id)).length;
          if (completedCount === goalsList.length) {
            initialGreeting += `¡Felicidades! Veo que has completado todas tus metas de hoy (${goalsList.map(g => `"${g.text}"`).join(', ')}). ¿Cómo te sientes con este logro?`;
          } else if (completedCount > 0) {
            initialGreeting += `Veo que ya avanzaste hoy completando ${completedCount} de tus metas. Aún tienes pendiente enfocar tu energía en tus siguientes pasos. ¿Cómo te gustaría abordar el resto de tu día?`;
          } else {
            const firstGoal = goalsList[0].text;
            initialGreeting += `Hoy tienes programadas tus metas: ${goalsList.map(g => `"${g.text}"`).join(', ')}. ¿Te gustaría comenzar con "${firstGoal}" o prefieres organizar tu plan paso a paso?`;
          }
        } else {
          initialGreeting += 'Estoy aquí para acompañarte en tu proceso personal. Aún no tienes metas registradas en "Mis Metas". ¿En qué hábito o proyecto te gustaría comenzar a trabajar hoy?';
        }

        setMessages([
          {
            id: 'init_welcome',
            role: 'model',
            text: initialGreeting
          }
        ]);
      }

      if (profile) {
        setProfileSummaryText('Perfil motivacional cargado');
      }
    } catch (err) {
      console.warn('Error loading chat context:', err);
    } finally {
      setContextLoaded(true);
    }
  }, [todayStr, messages.length]);

  useEffect(() => {
    loadUserContext();
  }, [loadUserContext]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setHasError(false);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const user = auth.currentUser;
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('Usuario no autenticado.');
      }
      
      const profile = user ? getDecryptedProfileFromLocal(user.uid) : null;
      const moodScaleObj = todayMood ? MOOD_SCALES.find(s => s.score === todayMood.score) : null;
      const realContext = buildMotivationalContext({
        profileAnswers: profile,
        goals,
        completedGoalIds,
        streakDays,
        todayMood: todayMood ? {
          score: todayMood.score,
          label: moodScaleObj?.label,
          energyScore: todayMood.energyScore,
          emotions: todayMood.emotions,
          triggers: todayMood.triggers,
          notes: todayMood.notes
        } : null
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('/api/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.text,
          history,
          context: realContext
        })
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Error al conectar con el asistente');
      
      const data = await response.json();
      
      if (data.risk_flag) {
        window.dispatchEvent(new CustomEvent('panic-triggered', { detail: { type: 'auto_detected' } }));
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.text
      }]);
    } catch (error) {
      console.error(error);
      setHasError(true);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Lo siento, hubo un problema al procesar tu mensaje. Por favor, inténtalo de nuevo. Si necesitas ayuda inmediata o estás pasando por una crisis, por favor utiliza el botón de asistencia y recursos de emergencia (icono de salvavidas) visible en la parte superior.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] bg-stone-50 rounded-xl border border-stone-200 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="bg-white p-4 border-b border-stone-200 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900">Asistente de Bienestar</h2>
              <span className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                Personalizado
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Conectado con tus metas reales y tu perfil motivacional.
            </p>
          </div>
        </div>

        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('panic-triggered', { detail: { type: 'manual' } }))}
          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Recursos de Emergencia"
        >
          <LifeBuoy size={20} />
        </button>
      </div>

      {hasError && (
        <div className="bg-rose-50 border-b border-rose-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-rose-800 font-medium">
            Si necesitas ayuda inmediata o estás pasando por una crisis, por favor utiliza el botón de asistencia y recursos de emergencia en pantalla.
          </p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('panic-triggered', { detail: { type: 'manual' } }))}
            className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            Ver Ayuda de Crisis
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div 
              className={`max-w-[82%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-stone-900 text-white rounded-br-xs' 
                  : 'bg-white border border-stone-200 text-stone-800 rounded-bl-xs shadow-2xs'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <div className="markdown-body prose prose-sm max-w-none text-stone-800">
                  <Markdown>{msg.text}</Markdown>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-stone-200 text-stone-600 p-3.5 rounded-2xl rounded-bl-xs text-xs flex items-center gap-2 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-800" />
              <span>Pensando una respuesta para tus metas...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-stone-200">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje sobre tus metas o estado de hoy..."
            className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white text-stone-900 placeholder:text-stone-400 transition-colors"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5 text-sm"
          >
            <span>Enviar</span>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
