import { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Plus, Trash2, CheckCircle2, ChevronRight, HelpCircle, ArrowRight } from 'lucide-react';
import { COGNITIVE_DISTORTIONS, CognitiveDistortion } from '../../data/moodSupportResources';

interface RestructuringEntry {
  id: string;
  date: string;
  thought: string;
  distortionId: string;
  distortionName: string;
  response: string;
}

export default function CognitiveRestructuringExercise() {
  const [entries, setEntries] = useState<RestructuringEntry[]>([]);
  const [thoughtInput, setThoughtInput] = useState('');
  const [selectedDistortionId, setSelectedDistortionId] = useState('filtro-mental');
  const [responseInput, setResponseInput] = useState('');
  const [showHelper, setShowHelper] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_cognitive_restructuring_entries');
      if (saved) {
        setEntries(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error reading cognitive restructuring entries:', e);
    }
  }, []);

  const saveEntriesToStorage = (updated: RestructuringEntry[]) => {
    setEntries(updated);
    try {
      localStorage.setItem('app_cognitive_restructuring_entries', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving cognitive restructuring entries:', e);
    }
  };

  const selectedDistortion = COGNITIVE_DISTORTIONS.find(d => d.id === selectedDistortionId) || COGNITIVE_DISTORTIONS[0];

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thoughtInput.trim() || !responseInput.trim()) return;

    const newEntry: RestructuringEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      thought: thoughtInput.trim(),
      distortionId: selectedDistortion.id,
      distortionName: selectedDistortion.name,
      response: responseInput.trim()
    };

    const updated = [newEntry, ...entries];
    saveEntriesToStorage(updated);
    setThoughtInput('');
    setResponseInput('');
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  const handleDeleteEntry = (id: string) => {
    const updated = entries.filter(item => item.id !== id);
    saveEntriesToStorage(updated);
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-6 text-stone-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-100 text-teal-800 border border-teal-200">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
              Método David D. Burns (Sentirse Bien)
            </span>
          </div>
          <h4 className="text-lg font-bold text-stone-900">
            Técnica de la Triple Columna: Reestructuración Cognitiva
          </h4>
          <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
            Cuando el ánimo decae, la mente produce pensamientos automáticos cargados de distorsiones. Al escribirlos y confrontarlos con una perspectiva compasiva y objetiva, la intensidad del malestar emocional disminuye de forma comprobada.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHelper(!showHelper)}
          className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-50 flex items-center gap-1.5 self-start sm:self-center shrink-0 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>{showHelper ? 'Ocultar Guía de Distorsiones' : 'Ver Lista de Distorsiones'}</span>
        </button>
      </div>

      {/* Distortions Guide Accordion */}
      {showHelper && (
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-3 animate-in fade-in duration-200">
          <h5 className="font-bold text-stone-900 uppercase tracking-wider text-2xs">
            Distorsiones Cognitivas Comunes que Agravan el Desánimo
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {COGNITIVE_DISTORTIONS.map(dist => (
              <div 
                key={dist.id} 
                onClick={() => setSelectedDistortionId(dist.id)}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  selectedDistortionId === dist.id 
                    ? 'bg-amber-50 border-amber-400 shadow-2xs' 
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <p className="font-bold text-stone-900 text-xs">{dist.name}</p>
                <p className="text-2xs text-stone-600 mt-1 leading-relaxed">{dist.description}</p>
                <p className="text-3xs text-amber-800 italic mt-1.5 font-medium">Ej: {dist.example}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Form */}
      <form onSubmit={handleSaveEntry} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Column 1: Automatic Thought */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-800 text-2xs flex items-center justify-center font-bold">1</span>
                <span>Pensamiento Automático</span>
              </label>
            </div>
            <p className="text-2xs text-stone-500">¿Qué frase negativa o autocrítica te está dando vueltas?</p>
            <textarea
              rows={4}
              required
              value={thoughtInput}
              onChange={e => setThoughtInput(e.target.value)}
              placeholder="Ej: 'No he hecho nada productivo hoy, todo mi esfuerzo es inútil y estoy defraudando a los demás...'"
              className="w-full text-xs p-2.5 rounded-lg border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>

          {/* Column 2: Distortion Selection */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-2xs flex items-center justify-center font-bold">2</span>
                <span>Distorsión Cognitiva</span>
              </label>
            </div>
            <p className="text-2xs text-stone-500">Identifica el sesgo lógico que contiene:</p>
            <select
              value={selectedDistortionId}
              onChange={e => setSelectedDistortionId(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            >
              {COGNITIVE_DISTORTIONS.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-2xs space-y-1">
              <p className="text-amber-900 font-semibold">{selectedDistortion.name}</p>
              <p className="text-stone-600">{selectedDistortion.description}</p>
              <div className="pt-1 text-amber-800 font-medium border-t border-amber-200/60">
                <strong>Pregunta clave:</strong> {selectedDistortion.counterQuestion}
              </div>
            </div>
          </div>

          {/* Column 3: Rational Response */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-2xs flex items-center justify-center font-bold">3</span>
                <span>Respuesta Racional y Compasiva</span>
              </label>
            </div>
            <p className="text-2xs text-stone-500">¿Qué le dirías con afecto y realismo a un ser querido?</p>
            <textarea
              rows={4}
              required
              value={responseInput}
              onChange={e => setResponseInput(e.target.value)}
              placeholder="Ej: 'Tener un día de baja energía es parte natural del cuerpo humano. No anula mis avances pasados ni me convierte en una carga...'"
              className="w-full text-xs p-2.5 rounded-lg border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          {isSavedSuccess ? (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>¡Desahogo y reestructuración guardados con éxito!</span>
            </span>
          ) : (
            <span className="text-2xs text-stone-500">
              Tus ejercicios se guardan localmente de forma privada en tu navegador.
            </span>
          )}

          <button
            type="submit"
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Guardar Ejercicio</span>
          </button>
        </div>
      </form>

      {/* History of Completed Exercises */}
      {entries.length > 0 && (
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <h5 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
            Tus Reestructuraciones Previas ({entries.length})
          </h5>
          
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {entries.map(item => (
              <div 
                key={item.id}
                className="p-4 rounded-xl bg-stone-50 border border-stone-200/90 text-xs space-y-2 relative group"
              >
                <div className="flex items-center justify-between text-2xs text-stone-500">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold border border-amber-200">
                    {item.distortionName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{item.date}</span>
                    <button
                      onClick={() => handleDeleteEntry(item.id)}
                      className="text-stone-400 hover:text-rose-600 p-1 rounded-md hover:bg-stone-200/60 transition-colors"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <span className="text-2xs font-bold text-rose-800 uppercase tracking-wider">Pensamiento que nublaba:</span>
                    <p className="text-stone-700 italic">"{item.thought}"</p>
                  </div>
                  <div className="space-y-1 p-2.5 rounded-lg bg-teal-50/70 border border-teal-200/80">
                    <span className="text-2xs font-bold text-teal-900 uppercase tracking-wider">Reformulación compasiva:</span>
                    <p className="text-teal-950 font-medium">"{item.response}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
