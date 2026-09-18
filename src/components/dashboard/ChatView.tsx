import { useState, useRef, useEffect, useCallback } from 'react';
import Markdown from 'react-markdown';
import { LifeBuoy, Send, Bot, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import botAvatar from '../public/Avatar.png';
import { auth } from '../../lib/firebase';
import { getGoals, getActivityLogs, getMoodLogs } from '../../lib/firestoreService';
import { getDecryptedProfileFromLocal, buildMotivationalContext } from '../../lib/userProfileContext';
import { generateSmartFallbackResponse } from '../../lib/chatIntelligence';
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
            const completedNames = goalsList.filter(g => completedIds.includes(g.id)).map(g => `"${g.text}"`).join(', ');
            initialGreeting += `Veo que ya avanzaste hoy completando ${completedNames}. Aún tienes en lista el resto de tus metas. ¿Cómo te gustaría abordar el resto de tu día?`;
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
      let token = 'guest-token';
      try {
        if (user) {
          token = await user.getIdToken() || 'guest-token';
        }
      } catch (e) {
        console.warn('Failed to get Firebase token, using guest token:', e);
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

      let data: { text: string; risk_flag?: boolean } | null = null;
      try {
        const clientKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        const response = await fetch('/api/chat', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(clientKey ? { 'x-gemini-key': clientKey } : {})
          },
          body: JSON.stringify({
            message: userMessage.text,
            history,
            context: realContext,
            apiKey: clientKey || undefined
          })
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          data = await response.json();
        } else {
          console.warn('Chat endpoint returned non-ok status:', response.status);
        }
      } catch (networkError) {
        console.warn('Network call failed, using smart contextual intelligence fallback:', networkError);
      }

      // If backend was unreachable or returned empty, generate contextual smart response locally
      if (!data || !data.text) {
        data = generateSmartFallbackResponse(userMessage.text, history, realContext);
      }

      if (data.risk_flag) {
        window.dispatchEvent(new CustomEvent('panic-triggered', { detail: { type: 'auto_detected' } }));
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data!.text
      }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      // Even in catch-all, deliver thoughtful personalized response
      const fallback = generateSmartFallbackResponse(userMessage.text, messages.map(m => ({ role: m.role, text: m.text })), '');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: fallback.text
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-220px)] min-h-[480px] sm:h-[650px] bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="bg-white p-3 sm:p-4 border-b border-stone-200 flex justify-between items-center">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img 
            src={botAvatar} 
            alt="Asistente de Bienestar" 
            referrerPolicy="no-referrer"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-stone-200/80 shadow-2xs shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">Asistente de Bienestar</h2>
              <span className="inline-flex items-center gap-1 text-3xs sm:text-2xs px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                Personalizado
              </span>
            </div>
            <p className="text-2xs sm:text-xs text-stone-500 line-clamp-1">
              Conectado con tus metas reales y tu perfil motivacional.
            </p>
          </div>
        </div>

        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('panic-triggered', { detail: { type: 'manual' } }))}
          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
          title="Recursos de Emergencia"
        >
          <LifeBuoy size={20} />
        </button>
      </div>

      {hasError && (
        <div className="bg-rose-50 border-b border-rose-100 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <img 
                src={botAvatar} 
                alt="Asistente" 
                referrerPolicy="no-referrer"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-stone-200/80 shadow-2xs shrink-0 mt-0.5" 
              />
            )}

            <div 
              className={`max-w-[88%] sm:max-w-[82%] p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
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
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2 justify-start">
            <img 
              src={botAvatar} 
              alt="Asistente" 
              referrerPolicy="no-referrer"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-stone-200/80 shadow-2xs shrink-0 mt-0.5" 
            />
            <div className="bg-white border border-stone-200 text-stone-600 p-3 sm:p-3.5 rounded-2xl rounded-bl-xs text-xs flex items-center gap-2 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-800" />
              <span>Pensando una respuesta para tus metas...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2.5 sm:p-3 bg-white border-t border-stone-200">
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
            placeholder="Escribe sobre tus metas o estado de hoy..."
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white text-stone-900 placeholder:text-stone-400 transition-colors"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:opacity-40 transition-colors font-medium flex items-center justify-center gap-1.5 text-xs sm:text-sm shrink-0"
          >
            <span className="hidden sm:inline">Enviar</span>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
