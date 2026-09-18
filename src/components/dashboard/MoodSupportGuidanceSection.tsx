import { useState } from 'react';
import { 
  BookOpen, 
  Video, 
  HeartHandshake, 
  Sparkles, 
  ExternalLink, 
  Play, 
  Copy, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  Users, 
  Compass, 
  Info,
  ShieldCheck,
  Search,
  Phone,
  ShieldAlert,
  PenTool,
  LifeBuoy
} from 'lucide-react';
import { MoodLog } from '../../types';
import { 
  CURATED_BOOK_REVIEWS, 
  CURATED_YOUTUBE_REVIEWS, 
  SOCIAL_INTELLIGENCE_PRACTICES, 
  BookReview, 
  VideoReview 
} from '../../data/moodSupportResources';
import { auth } from '../../lib/firebase';
import EmergencyHelplinesModal from './EmergencyHelplinesModal';
import CognitiveRestructuringExercise from './CognitiveRestructuringExercise';
import VitaminPersonExercise from './VitaminPersonExercise';

interface MoodSupportGuidanceSectionProps {
  logs: MoodLog[];
  todayLog?: MoodLog;
  overallAvgMood: number;
  overallAvgEnergy: number;
  insights?: any;
  isLowMoodDetected: boolean;
}

export default function MoodSupportGuidanceSection({
  logs,
  todayLog,
  overallAvgMood,
  overallAvgEnergy,
  insights,
  isLowMoodDetected
}: MoodSupportGuidanceSectionProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'social' | 'books' | 'videos' | 'exercises'>('all');
  const [selectedVideo, setSelectedVideo] = useState<VideoReview | null>(null);
  const [aiGuidance, setAiGuidance] = useState<any | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [copiedTipId, setCopiedTipId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelplinesModal, setShowHelplinesModal] = useState(false);

  const handleCopyPhrase = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTipId(id);
    setTimeout(() => setCopiedTipId(null), 2500);
  };

  const handleGenerateAiGuidance = async () => {
    try {
      setIsLoadingAi(true);
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      
      const res = await fetch('/api/mood-guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          logs,
          todayMood: todayLog,
          summary: {
            overallAvgMood,
            overallAvgEnergy,
            topLowTrigger: insights?.topLowTrigger,
            topPositiveTrigger: insights?.topPositiveTrigger
          }
        })
      });

      if (!res.ok) throw new Error('Error al conectar con el asistente de ánimo');
      const data = await res.json();
      setAiGuidance(data);
    } catch (err) {
      console.error('Error fetching AI mood guidance:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const filteredBooks = CURATED_BOOK_REVIEWS.filter(book => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return book.title.toLowerCase().includes(q) ||
           book.author.toLowerCase().includes(q) ||
           book.tag.toLowerCase().includes(q) ||
           book.synopsis.toLowerCase().includes(q);
  });

  const filteredVideos = CURATED_YOUTUBE_REVIEWS.filter(video => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return video.title.toLowerCase().includes(q) ||
           video.speaker.toLowerCase().includes(q) ||
           video.tag.toLowerCase().includes(q) ||
           video.synopsis.toLowerCase().includes(q);
  });

  const filteredSocial = SOCIAL_INTELLIGENCE_PRACTICES.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) ||
           item.principle.toLowerCase().includes(q) ||
           item.description.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8">
      {/* Top Banner / Framing */}
      <div className={`p-6 rounded-2xl border shadow-xs transition-all ${
        isLowMoodDetected 
          ? 'bg-linear-to-br from-orange-50 via-amber-50 to-stone-50 border-amber-300' 
          : 'bg-stone-50 border-stone-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-600 text-white shadow-2xs">
                <HeartHandshake className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Acompañamiento con Inteligencia Social
              </span>
              {isLowMoodDetected && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-2xs font-semibold">
                  Atención Activa
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-stone-900">
              {isLowMoodDetected 
                ? 'Espacio de Contención, Lecturas y Videos Terapéuticos' 
                : 'Guía de Inteligencia Social y Recursos para el Estado de Ánimo'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
              La <strong>inteligencia social</strong> nos enseña que el bajo estado de ánimo activa un impulso defensivo de replegarse y aislarse, alimentando la falsa creencia de que "somos una molestia". Remontar el desánimo persistente requiere desarticular la rumiación, proteger la batería emocional y activar micro-conexiones seguras.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
            <button
              onClick={() => setShowHelplinesModal(true)}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <LifeBuoy className="w-4 h-4 text-rose-600" />
              <span>Líneas de Ayuda (24/7)</span>
            </button>

            <button
              onClick={handleGenerateAiGuidance}
              disabled={isLoadingAi}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all hover:shadow-md disabled:opacity-70"
            >
              {isLoadingAi ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Analizando patrones...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{aiGuidance ? 'Actualizar Análisis IA' : 'Generar Análisis Personalizado'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic AI Analysis Section (if triggered) */}
      {aiGuidance && (
        <div className="p-6 rounded-2xl bg-linear-to-br from-stone-900 via-stone-850 to-stone-900 text-white border border-stone-800 shadow-md space-y-5 animate-in fade-in zoom-in-98 duration-300">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-amber-200">
                  Plan de Inteligencia Social Personalizado • Asistente Ruta
                </h4>
                <p className="text-2xs text-stone-400">
                  Generado a partir de tus detonantes ({insights?.topLowTrigger || 'registrados'}) y tu promedio actual ({overallAvgMood}/5).
                </p>
              </div>
            </div>
            <button
              onClick={() => setAiGuidance(null)}
              className="p-1 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-white/10"
              title="Ocultar análisis"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Empathic Analysis & Social Insight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <Compass className="w-3.5 h-3.5" />
                <span>Validación y Lectura Emocional</span>
              </div>
              <p className="text-stone-300 text-xs leading-relaxed">
                {aiGuidance.empathicAnalysis}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-teal-300 font-semibold text-xs">
                <Users className="w-3.5 h-3.5" />
                <span>Perspectiva de Inteligencia Social</span>
              </div>
              <p className="text-stone-300 text-xs leading-relaxed">
                {aiGuidance.socialIntelligenceInsight}
              </p>
            </div>
          </div>

          {/* Key Advice Cards */}
          {aiGuidance.keyAdvice && aiGuidance.keyAdvice.length > 0 && (
            <div className="space-y-2 pt-1">
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Estrategias Específicas de Refuerzo
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {aiGuidance.keyAdvice.map((adv: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-2">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 text-2xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      {adv.title}
                    </p>
                    <p className="text-2xs text-stone-300 leading-relaxed">
                      {adv.description}
                    </p>
                    <div className="pt-1 border-t border-white/10 text-2xs text-amber-200 font-medium">
                      <strong>Acción:</strong> {adv.actionableStep}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Curated AI Reading & Video Picks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {aiGuidance.bookRecommendation && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <BookOpen className="w-4 h-4" />
                  <span>Lectura Sugerida para tu Caso</span>
                </div>
                <h6 className="text-sm font-bold text-white">
                  "{aiGuidance.bookRecommendation.title}"
                </h6>
                <p className="text-2xs text-amber-200/90 font-medium">
                  Por {aiGuidance.bookRecommendation.author}
                </p>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {aiGuidance.bookRecommendation.review}
                </p>
                <div className="p-2.5 rounded-lg bg-black/40 text-2xs text-amber-200 space-y-1">
                  <p><strong>Por qué aplica:</strong> {aiGuidance.bookRecommendation.whyItHelps}</p>
                  <p><strong>Ejercicio clave:</strong> {aiGuidance.bookRecommendation.keyExercise}</p>
                </div>
              </div>
            )}

            {aiGuidance.videoRecommendation && (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                  <Video className="w-4 h-4" />
                  <span>Conferencia / Video Recomendado</span>
                </div>
                <h6 className="text-sm font-bold text-white">
                  "{aiGuidance.videoRecommendation.title}"
                </h6>
                <p className="text-2xs text-rose-200/90 font-medium">
                  {aiGuidance.videoRecommendation.speaker} ({aiGuidance.videoRecommendation.channel})
                </p>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {aiGuidance.videoRecommendation.review}
                </p>
                <div className="p-2.5 rounded-lg bg-black/40 text-2xs text-rose-200 space-y-2">
                  <p><strong>Mensaje clave:</strong> {aiGuidance.videoRecommendation.keyTakeaway}</p>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(aiGuidance.videoRecommendation.youtubeSearchQuery || aiGuidance.videoRecommendation.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-2xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Buscar y ver en YouTube</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Immediate Action */}
          {aiGuidance.immediateAction && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <strong className="text-emerald-300">Micro-acción de 2 minutos para hoy: </strong>
                {aiGuidance.immediateAction}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'all' 
                ? 'bg-stone-900 text-white' 
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Todos los Recursos ({CURATED_BOOK_REVIEWS.length + CURATED_YOUTUBE_REVIEWS.length + SOCIAL_INTELLIGENCE_PRACTICES.length})
          </button>
          <button
            onClick={() => setActiveFilter('social')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeFilter === 'social' 
                ? 'bg-stone-900 text-white' 
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>Inteligencia Social ({SOCIAL_INTELLIGENCE_PRACTICES.length})</span>
          </button>
          <button
            onClick={() => setActiveFilter('books')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeFilter === 'books' 
                ? 'bg-stone-900 text-white' 
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
            <span>Lecturas Reseñadas ({CURATED_BOOK_REVIEWS.length})</span>
          </button>
          <button
            onClick={() => setActiveFilter('videos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeFilter === 'videos' 
                ? 'bg-stone-900 text-white' 
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-rose-600" />
            <span>Videos de YouTube ({CURATED_YOUTUBE_REVIEWS.length})</span>
          </button>
          <button
            onClick={() => setActiveFilter('exercises')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeFilter === 'exercises' 
                ? 'bg-stone-900 text-white' 
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-purple-600" />
            <span>Ejercicios Prácticos (2)</span>
          </button>
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por tema o autor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
        </div>
      </div>

      {/* SECTION 1: SOCIAL INTELLIGENCE PRACTICES */}
      {(activeFilter === 'all' || activeFilter === 'social') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-100 text-amber-800">
              <Users className="w-4 h-4" />
            </span>
            <h4 className="text-base font-bold text-stone-900">
              Estrategias de Inteligencia Social para Momentos Difíciles
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSocial.map(tip => (
              <div 
                key={tip.id}
                className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-2xs font-semibold border border-amber-200">
                      {tip.principle}
                    </span>
                    <span className="text-2xs text-stone-400 capitalize">
                      {tip.category}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-stone-900">
                    {tip.title}
                  </h5>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {tip.description}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-stone-100">
                  <div className="text-xs text-stone-800">
                    <strong className="text-stone-900">Paso accionable: </strong>
                    {tip.actionableStep}
                  </div>

                  {tip.examplePhrase && (
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 flex items-start justify-between gap-2">
                      <p className="italic text-2xs leading-relaxed">
                        {tip.examplePhrase}
                      </p>
                      <button
                        onClick={() => handleCopyPhrase(tip.id, tip.examplePhrase!)}
                        className="p-1 text-stone-400 hover:text-stone-800 shrink-0 rounded-md hover:bg-stone-200/50 transition-colors"
                        title="Copiar frase"
                      >
                        {copiedTipId === tip.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: CURATED BOOK REVIEWS */}
      {(activeFilter === 'all' || activeFilter === 'books') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-teal-100 text-teal-800">
                <BookOpen className="w-4 h-4" />
              </span>
              <h4 className="text-base font-bold text-stone-900">
                Lecturas Terapéuticas Reseñadas
              </h4>
            </div>
            <span className="text-2xs text-stone-500 font-medium">
              Obras clave de psicología, neurobiología y autocompasión
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredBooks.map(book => (
              <div 
                key={book.id}
                className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-2xs font-semibold">
                      {book.tag}
                    </span>
                    <span className="text-2xs text-stone-400">
                      {book.year}
                    </span>
                  </div>

                  <div>
                    <h5 className="text-base font-bold text-stone-900 leading-snug">
                      {book.title}
                    </h5>
                    <p className="text-xs font-semibold text-stone-600 mt-0.5">
                      {book.author}
                    </p>
                  </div>

                  {/* Synopsis */}
                  <div className="text-xs text-stone-600 leading-relaxed space-y-1">
                    <strong className="text-stone-800 block text-2xs uppercase tracking-wider">
                      Reseña de la Obra:
                    </strong>
                    <p>{book.synopsis}</p>
                  </div>

                  {/* Social Intelligence Highlight */}
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 text-2xs uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5 text-amber-700" />
                      <span>Enfoque de Inteligencia Social</span>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-900/90">
                      {book.socialIntelligenceFocus}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <div className="text-xs text-stone-700">
                    <strong className="text-stone-900">Por qué ayuda en ánimo bajo: </strong>
                    {book.whyItHelpsLowMood}
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-2xs text-stone-700">
                    <strong className="text-stone-900">Práctica recomendada: </strong>
                    {book.keyExercise}
                  </div>
                  <div className="flex items-center justify-between text-2xs text-stone-400 pt-1">
                    <span>Ritmo: {book.readingPace}</span>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(book.title + ' ' + book.author)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold underline"
                    >
                      <span>Buscar libro</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: CURATED YOUTUBE VIDEO REVIEWS */}
      {(activeFilter === 'all' || activeFilter === 'videos') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-rose-100 text-rose-800">
                <Video className="w-4 h-4" />
              </span>
              <h4 className="text-base font-bold text-stone-900">
                Videos y Conferencias en YouTube Recomendados
              </h4>
            </div>
            <span className="text-2xs text-stone-500 font-medium">
              Charlas especializadas para ver y reflexionar
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredVideos.map(video => (
              <div 
                key={video.id}
                className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-2xs font-semibold">
                      {video.tag}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-2xs font-medium">
                      ⏱ {video.duration}
                    </span>
                  </div>

                  <div>
                    <h5 className="text-base font-bold text-stone-900 leading-snug">
                      {video.title}
                    </h5>
                    <p className="text-xs font-semibold text-rose-700 mt-0.5">
                      {video.speaker} • <span className="text-stone-500 font-normal">{video.channelOrEvent}</span>
                    </p>
                  </div>

                  {/* Synopsis */}
                  <div className="text-xs text-stone-600 leading-relaxed space-y-1">
                    <strong className="text-stone-800 block text-2xs uppercase tracking-wider">
                      Reseña del Contenido:
                    </strong>
                    <p>{video.synopsis}</p>
                  </div>

                  {/* Social Intelligence Highlight */}
                  <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200 text-xs text-orange-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-orange-900 text-2xs uppercase tracking-wider">
                      <HeartHandshake className="w-3.5 h-3.5 text-orange-700" />
                      <span>Aplicación de Inteligencia Social</span>
                    </div>
                    <p className="text-xs leading-relaxed text-orange-900/90">
                      {video.socialIntelligenceApplication}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-stone-100">
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-2xs text-stone-700">
                    <strong className="text-stone-900">Lección principal: </strong>
                    {video.keyTakeaway}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setSelectedVideo(video)}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>Reproducir en la app</span>
                    </button>

                    <a
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir en YouTube</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: INTERACTIVE PRACTICAL EXERCISES */}
      {(activeFilter === 'all' || activeFilter === 'exercises') && (
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-purple-100 text-purple-800">
                <PenTool className="w-4 h-4" />
              </span>
              <h4 className="text-base font-bold text-stone-900">
                Herramientas Prácticas Interactivas
              </h4>
            </div>
            <span className="text-2xs text-stone-500 font-medium">
              Ejercicios guiados de aplicación inmediata
            </span>
          </div>

          {/* Exercise 1: Cognitive Restructuring */}
          <CognitiveRestructuringExercise />

          {/* Exercise 2: Safe Vitamin Person Circle */}
          <VitaminPersonExercise />
        </div>
      )}

      {/* EMERGENCY HELPLINES MODAL */}
      <EmergencyHelplinesModal
        isOpen={showHelplinesModal}
        onClose={() => setShowHelplinesModal(false)}
      />

      {/* YOUTUBE EMBED MODAL */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-stone-900 text-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-stone-800 my-8 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-white leading-snug">
                  {selectedVideo.title}
                </h4>
                <p className="text-xs text-stone-400">
                  {selectedVideo.speaker} • {selectedVideo.channelOrEvent} ({selectedVideo.duration})
                </p>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Iframe */}
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner border border-stone-800">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${selectedVideo.youtubeId}?autoplay=1&rel=0`}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* Takeaways */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5">
              <p className="text-amber-300 font-semibold text-2xs uppercase tracking-wider">
                Reflexión de Inteligencia Social:
              </p>
              <p className="text-stone-300 leading-relaxed">
                {selectedVideo.socialIntelligenceApplication}
              </p>
              <p className="text-stone-400 text-2xs pt-1 border-t border-white/10">
                <strong>Clave:</strong> {selectedVideo.keyTakeaway}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <a
                href={selectedVideo.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-stone-400 hover:text-white text-xs font-semibold flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ver directamente en YouTube</span>
              </a>
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
