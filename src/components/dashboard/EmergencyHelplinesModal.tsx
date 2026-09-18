import { Phone, X, ShieldAlert, HeartHandshake, ExternalLink } from 'lucide-react';
import { EMERGENCY_HELPLINES } from '../../data/moodSupportResources';

interface EmergencyHelplinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmergencyHelplinesModal({ isOpen, onClose }: EmergencyHelplinesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 my-8 space-y-5 animate-in fade-in zoom-in-95 duration-200 text-stone-900">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Líneas de Ayuda y Soporte Emocional Inmediato
              </h3>
              <p className="text-2xs text-stone-500">
                Servicios públicos, gratuitos y confidenciales disponibles 24/7
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Framing reminder */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5 leading-relaxed">
          <HeartHandshake className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>No estás solo/a en momentos difíciles.</strong> Si tú o alguien cercano siente que el dolor emocional es abrumador, comunicarte con un profesional de la salud mental de forma gratuita y anónima puede brindarte alivio y claridad de inmediato.
          </div>
        </div>

        {/* Helplines List */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {EMERGENCY_HELPLINES.map((item, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/90 hover:border-stone-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.flag}</span>
                  <span className="text-xs font-bold text-stone-900">{item.country}</span>
                  <span className="text-2xs text-stone-500 font-medium">• {item.hours}</span>
                </div>
                <p className="text-xs font-semibold text-stone-700">{item.name}</p>
                <p className="text-2xs text-stone-500">{item.notes}</p>
              </div>

              <a
                href={`tel:${item.phone.replace(/[^0-9+]/g, '')}`}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 shadow-2xs transition-colors self-start sm:self-center"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{item.phone}</span>
              </a>
            </div>
          ))}
        </div>

        {/* Footer International info */}
        <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-2xs text-stone-500">
          <p>Para otros países: consulta <strong>befrienders.org</strong> o <strong>findahelpline.com</strong></p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-semibold self-end sm:self-auto transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
