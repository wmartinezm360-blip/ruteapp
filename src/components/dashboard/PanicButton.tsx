import { useState, useEffect } from 'react';
import { LifeBuoy, X, Phone, Globe, ExternalLink } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { getCrisisResources, logRiskEvent } from '../../lib/firestoreService';

// ATENCIÓN ADMINISTRADOR / DESARROLLADOR:
// FALLBACK_RESOURCES es un respaldo estático de último recurso.
// Si se modifican, agregan o eliminan números, recursos, o enlaces oficiales 
// de ayuda en la colección 'crisis_resources' de Firestore desde el panel Superadmin, 
// este objeto DEBE actualizarse manualmente en el código para mantener la paridad 
// y asegurar la disponibilidad en escenarios de desconexión o fallo del servidor.
const FALLBACK_RESOURCES = {
  local: {
    country: 'Colombia (Fallback)',
    items: [
      {
        name: 'Línea 106 — Salud Mental (Minsalud)',
        phone: '106',
        availability: '24 horas, los 7 días de la semana',
        channels: 'Llamada telefónica y videollamada',
        coverage: 'Nacional'
      },
      {
        name: 'Línea de emergencias',
        phone: '123',
        usage: 'Si hay riesgo inmediato para la vida, contactar directamente a emergencias.'
      }
    ]
  },
  international: {
    country: 'Internacional',
    items: [
      {
        name: 'Befrienders Worldwide',
        url: 'https://www.befrienders.org/',
        usage: 'Red internacional de líneas de escucha en crisis.'
      },
      {
        name: 'IASP (International Association for Suicide Prevention)',
        url: 'https://www.iasp.info/resources/Crisis_Centres/',
        usage: 'Recursos y centros de crisis organizados por país.'
      }
    ]
  }
};

export default function PanicButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [resources, setResources] = useState<any>(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    // Fetch resources ahead of time so they are ready if needed (post-login)
    const fetchResources = async () => {
      try {
        const data = await getCrisisResources('CO');
        setResources(data);
      } catch (e) {
        console.error('Error fetching crisis resources', e);
        setResources(FALLBACK_RESOURCES);
      }
    };
    fetchResources();
  }, [uid]);

  if (!uid) return null;

  const triggerPanic = async (triggerType: 'manual' | 'auto_detected') => {
    setIsOpen(true);
    // If not fetched for some reason, assign fallback immediately to avoid empty state
    if (!resources) {
      setResources(FALLBACK_RESOURCES);
    }
    try {
      await logRiskEvent(triggerType);
    } catch (e) {
      console.error('Error logging risk event', e);
    }
  };

  useEffect(() => {
    const handleEvent = (e: any) => {
      if (e.detail?.type) {
        triggerPanic(e.detail.type);
      }
    };
    window.addEventListener('panic-triggered', handleEvent);
    return () => window.removeEventListener('panic-triggered', handleEvent);
  }, [resources]);

  return (
    <>
      {/* Botón Discreto Flotante (Global) */}
      <button
        onClick={() => triggerPanic('manual')}
        className="fixed bottom-3.5 left-3.5 sm:bottom-6 sm:left-6 p-2.5 sm:p-3 bg-white/95 backdrop-blur-xs text-stone-600 rounded-full shadow-md border border-stone-200 hover:bg-stone-100 hover:text-stone-900 transition-all z-40 flex items-center gap-2 group"
        title="Recursos de Apoyo"
      >
        <LifeBuoy size={20} className="shrink-0" />
        <span className="text-xs font-medium max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 ease-in-out whitespace-nowrap opacity-0 group-hover:opacity-100">
          Ayuda / Emergencia
        </span>
      </button>

      {/* Modal de Emergencia */}
      {isOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3.5 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-2xl relative max-h-[92dvh] overflow-y-auto">
            <div className="flex flex-col items-center text-center mb-6 mt-2">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 text-rose-600">
                <LifeBuoy size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-stone-900 mb-2">Estamos aquí contigo. No tienes que pasar por esto solo/a.</h2>
              <p className="text-stone-600">
                Estas líneas son gratuitas, confidenciales y atendidas por personas capacitadas.
              </p>
            </div>
            
            <div className="space-y-6">
              {resources?.local && (
                <div>
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Phone size={16} /> EN {resources.local.country?.toUpperCase() || 'TU PAÍS'}
                  </h3>
                  <div className="space-y-3">
                    {resources.local.items?.map((item: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl border border-rose-100 bg-rose-50">
                        <h4 className="font-semibold text-stone-900">{item.name}</h4>
                        {item.phone && <p className="text-rose-700 font-bold text-lg mt-1">{item.phone}</p>}
                        {item.availability && <p className="text-sm text-stone-600 mt-1">{item.availability}</p>}
                        {item.channels && <p className="text-sm text-stone-600">{item.channels} - {item.coverage}</p>}
                        {item.usage && <p className="text-sm text-stone-600 mt-1">{item.usage}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resources?.international && (
                <div>
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Globe size={16} /> INTERNACIONAL (RESPALDO)
                  </h3>
                  <div className="space-y-3">
                    {resources.international.items?.map((item: any, idx: number) => (
                      <a 
                        key={idx}
                        href={item.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-colors group"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-stone-900 group-hover:text-rose-600 transition-colors">{item.name}</h4>
                          <ExternalLink size={16} className="text-stone-400" />
                        </div>
                        {item.usage && <p className="text-sm text-stone-600 mt-1">{item.usage}</p>}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-stone-100 flex flex-col items-center">
              <p className="text-sm text-stone-500 mb-4 text-center">Puedes quedarte aquí el tiempo que necesites.</p>
              <button 
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium"
              >
                Volver a la app
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
