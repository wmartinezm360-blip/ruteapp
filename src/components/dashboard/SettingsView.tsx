import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, FileText } from 'lucide-react';
import ExportReportModal from './ExportReportModal';
import { auth } from '../../lib/firebase';
import { getUserStatus, requestDeletion, cancelDeletion } from '../../lib/firestoreService';

export default function SettingsView() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPendingDeletion, setIsPendingDeletion] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);

  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const uid = currentUid;
        if (!uid) {
          setIsInitialLoading(false);
          return;
        }
        const status = await getUserStatus();
        if (status === 'pending_deletion') {
          setIsPendingDeletion(true);
        }
      } catch (e) {}
      setIsInitialLoading(false);
    };
    checkStatus();
  }, [currentUid]);

  if (!currentUid) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-lg font-medium text-stone-900 mb-2">Sesión no válida</h3>
        <p className="text-sm text-stone-600">Por favor inicia sesión de nuevo para acceder a tus ajustes.</p>
      </div>
    );
  }

  const handleCancelDeletion = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await cancelDeletion();
      setSuccessMsg('Se ha cancelado la eliminación. Tu cuenta vuelve a estar activa.');
      setIsPendingDeletion(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await requestDeletion();
      setSuccessMsg('Tu cuenta ha sido programada para eliminación en 14 días. Ya no podrás iniciar sesión. Si deseas cancelarlo, contacta a soporte.');
      setShowConfirm(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Ajustes</h2>
        <p className="text-stone-600">Gestiona tu cuenta y preferencias de privacidad.</p>
      </div>

      
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <h3 className="text-lg font-medium text-stone-900 mb-2 flex items-center gap-2">
          <FileText size={20} /> Exportar Datos
        </h3>
        <p className="text-sm text-stone-600 mb-4">
          Genera un informe en PDF con tus datos de autorregistro (metas, estado de ánimo) para compartir con tu profesional de la salud mental.
        </p>
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
        >
          <FileText size={16} /> Generar Informe de Seguimiento
        </button>
      </div>
      
      <ExportReportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        uid={currentUid} 
      />

      <div className="bg-red-50 border border-red-100 rounded-xl p-6">
        <h3 className="text-lg font-medium text-red-900 mb-2 flex items-center gap-2">
          <AlertTriangle size={20} /> Zona de Peligro
        </h3>
        <p className="text-sm text-red-800 mb-4">
          Eliminar tu cuenta es una acción irreversible después del periodo de gracia de 14 días. 
          Se eliminarán de forma permanente todos tus datos personales, histórico de chat, metas y registros de actividad.
        </p>

        {isInitialLoading ? (
          <p className="text-sm text-stone-500">Cargando estado...</p>
        ) : isPendingDeletion ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-red-700">Tu cuenta está actualmente programada para eliminación.</p>
            <button
              onClick={handleCancelDeletion}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm disabled:opacity-50"
            >
              Cancelar eliminación de cuenta
            </button>
          </div>
        ) : !showConfirm && !successMsg && (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
          >
            <Trash2 size={16} /> Solicitar eliminación de cuenta
          </button>
        )}

        {showConfirm && (
          <div className="bg-white p-4 rounded-lg border border-red-200 space-y-4">
            <p className="text-sm font-medium text-stone-900">
              ¿Estás completamente seguro? Tu cuenta será bloqueada inmediatamente.
            </p>
            {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleRequestDeletion}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isLoading ? 'Procesando...' : 'Sí, eliminar mi cuenta'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm font-medium">
            {successMsg}
          </div>
        )}
      </div>
    </div>
  );
}
