import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { LifeBuoy } from 'lucide-react';
import { auth } from '../../lib/firebase';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setHasError(false);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Usuario no autenticado.');
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.text,
          history,
          context: 'El usuario tiene 5 días de racha. Su meta principal es: "Hábito de Lectura".'
        })
      });

      if (!response.ok) throw new Error('Error al conectar con el asistente');
      
      const data = await response.json();
      
      // Auto-detect crisis language from bot's structured output
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
        text: 'Lo siento, hubo un problema al procesar tu mensaje. Por favor, inténtalo de nuevo. Si necesitas ayuda inmediata o estás pasando por una crisis, por favor utiliza el botón de asistencia y recursos de emergencia (icono de salvavidas) visible en la parte superior de la interfaz.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="bg-white p-4 border-b border-stone-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Asistente de Bienestar</h2>
          <p className="text-sm text-stone-500">Apoyo motivacional y estrategias prácticas.</p>
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
          <p className="text-sm text-rose-800 font-medium">
            Si necesitas ayuda inmediata o estás pasando por una crisis, por favor utiliza el botón de asistencia y recursos de emergencia (icono de salvavidas) visible en la parte superior de la interfaz.
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
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-2">
            <p>¡Hola! Estoy aquí para apoyarte.</p>
            <p className="text-sm text-center px-8">
              Cuéntame cómo te sientes hoy o si necesitas ayuda para mantenerte enfocado en tus metas.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-stone-900 text-white rounded-br-sm' 
                    : 'bg-white border border-stone-200 text-stone-800 rounded-bl-sm markdown-body'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <Markdown>{msg.text}</Markdown>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 bg-white border border-stone-200 rounded-2xl rounded-bl-sm flex space-x-2 items-center">
              <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-stone-200">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 transition-colors"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium disabled:opacity-50 transition-opacity"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
