import { useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { decryptUserProfile } from '../../lib/profile';
import { generateReportPDF } from '../../lib/pdfReportGenerator';
import { auth } from '../../lib/firebase';
import { exportReportData } from '../../lib/firestoreService';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
}

export default function ExportReportModal({ isOpen, onClose, uid }: ExportReportModalProps) {
  const [userConsentedToRiskEvents, setUserConsentedToRiskEvents] = useState(false);
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!periodStart || !periodEnd) {
      setErrorMsg('Por favor selecciona las fechas de inicio y fin.');
      return;
    }
    
    const startTs = new Date(periodStart).getTime();
    const endTs = new Date(periodEnd).getTime();

    if (startTs > endTs) {
      setErrorMsg('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    if (!pin || pin.length !== 6) {
      setErrorMsg('Por favor ingresa tu PIN de seguridad de 6 dígitos.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. Desencriptar el perfil estrictamente en el cliente (E2EE)
      let profileAnswers: Record<string, string> = {};
      try {
        profileAnswers = await decryptUserProfile(uid, pin);
      } catch (err) {
        throw new Error('PIN incorrecto. Por favor, intenta de nuevo.');
      }

      // 2. Obtener únicamente los registros no sensibles de telemetría y registrar auditoría directo de Firestore
      const { goals, activityLogs, riskEvents } = await exportReportData(
        startTs,
        endTs,
        userConsentedToRiskEvents
      );

      // 3. Generar y descargar el PDF 100% en el cliente (Browser)
      generateReportPDF({
        periodStart: startTs,
        periodEnd: endTs,
        goals: (goals as any) || [],
        activityLogs: (activityLogs as any) || [],
        riskEvents: (riskEvents as any) || [],
        userConsentedToRiskEvents,
        onboardingAnswers: profileAnswers
      });
      
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar el informe');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X size={24} />
        </button>
        
        <div className="flex items-center gap-3 mb-6 text-stone-900">
          <FileText size={28} />
          <h2 className="text-2xl font-semibold">Informe de Seguimiento</h2>
        </div>
        
        <div className="space-y-6">
          <p className="text-stone-600 text-sm">
            Genera un informe en PDF con tus datos de autorregistro para compartir con tu profesional de salud. El informe incluye tu perfil inicial, adherencia a metas y registro de estado de ánimo.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Fecha de inicio</label>
              <input 
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Fecha de fin</label>
              <input 
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">PIN de Seguridad (Requerido para descifrar tu perfil localmente - E2EE)</label>
            <input 
              type="password"
              maxLength={6}
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 text-center font-mono tracking-widest text-lg"
            />
          </div>

          <div className="bg-stone-50 border border-stone-200 p-4 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={userConsentedToRiskEvents}
                onChange={(e) => setUserConsentedToRiskEvents(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              />
              <span className="text-sm text-stone-700 leading-relaxed">
                <strong>Consentimiento opcional:</strong> Deseo incluir las fechas en que se activaron los protocolos de seguridad de la aplicación (únicamente fechas y marcas temporales, sin contenido de conversación ni diagnósticos clínicos).
              </span>
            </label>
          </div>

          {errorMsg && <p className="text-sm text-red-600 font-medium">{errorMsg}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button 
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleExport}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isLoading ? (
                'Generando...'
              ) : (
                <>
                  <Download size={16} /> Generar PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
