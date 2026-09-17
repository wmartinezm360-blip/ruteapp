import { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, Search, Activity } from 'lucide-react';
import { auth } from '../../lib/firebase';

export default function AdminPanelView() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchUid, setSearchUid] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [riskMetrics, setRiskMetrics] = useState({ total: 0, auto: 0, manual: 0 });

  // Fetch a list of recent users and aggregate risk metrics via backend API
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const [usersRes, metricsRes] = await Promise.all([
          fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/admin/risk-metrics', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (usersRes.ok) {
          const { users: usersData } = await usersRes.json();
          setUsers(usersData || []);
        }

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setRiskMetrics(metricsData);
        }
      } catch (e) {
        console.error('Error fetching admin data via API:', e);
      }
    };

    fetchAdminData();
  }, []);

  const handleAdminDeletion = async () => {
    if (!selectedUser) return;
    if (!reason.trim()) {
      setErrorMsg('Debe proporcionar un motivo obligatorio para el registro de auditoría.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setMessage('');

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Usuario superadministrador no autenticado.');

      const response = await fetch('/api/admin/request-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUid: selectedUser.id,
          reason: reason.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al solicitar eliminación');
      }

      setMessage(`El usuario ${selectedUser.id} ha sido programado para eliminación. El acceso ha sido bloqueado.`);
      setSelectedUser(null);
      setReason('');
      
      // Update local state to reflect deletion
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, status: 'pending_deletion' } : u));
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = searchUid 
    ? users.filter(u => u.id.includes(searchUid) || (u.email && u.email.includes(searchUid)))
    : users;

  return (
    <div className="max-w-5xl mx-auto p-6 min-h-screen bg-stone-50">
      <header className="mb-8 border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
          <ShieldAlert className="text-red-600" size={32} />
          Panel de Superadministrador
        </h1>
        <p className="text-stone-600 mt-2">
          Gestión de integridad de la plataforma. Acciones restringidas.
        </p>
      </header>

      {/* Aggregate Metrics Panel */}
      <div className="mb-8 p-6 bg-stone-900 rounded-2xl text-white shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
            <Activity size={20} className="text-rose-400" />
            Métricas de Riesgo Globales (Agregadas)
          </h2>
          <p className="text-sm text-stone-400">
            Conteo de activaciones del botón de pánico. Por política de privacidad, no se vinculan eventos a usuarios específicos ni se audita el contenido.
          </p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-white">{riskMetrics.total}</div>
            <div className="text-xs text-stone-400 uppercase tracking-wider mt-1">Total</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-stone-300">{riskMetrics.manual}</div>
            <div className="text-xs text-stone-400 uppercase tracking-wider mt-1">Manual</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-rose-400">{riskMetrics.auto}</div>
            <div className="text-xs text-stone-400 uppercase tracking-wider mt-1">Auto</div>
          </div>
        </div>
      </div>

      {/* Synchronization Reminder Note */}
      <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
        <p className="text-sm">
          <strong>Recordatorio de Sincronización Crítica:</strong> Si cambias o actualizas los recursos oficiales de crisis de la base de datos, recuerda actualizar también el respaldo estático en el código del cliente (<code>FALLBACK_RESOURCES</code> en <code>PanicButton.tsx</code>) para garantizar acceso ininterrumpido en casos de fallo de red o caída del servidor.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* User List */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-stone-800">Directorio de Usuarios</h2>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-stone-400" size={18} />
            <input 
              type="text"
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              placeholder="Buscar por UID o Email..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
            />
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {filteredUsers.map(u => (
              <div 
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedUser?.id === u.id ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                <div className="font-medium text-stone-900">{u.id}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-stone-500">{u.email || 'Sin correo'}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    u.status === 'pending_deletion' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {u.status === 'pending_deletion' ? 'Programado para borrado' : 'Activo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-stone-800">Acciones de Integridad</h2>
          
          {!selectedUser ? (
            <div className="h-48 flex items-center justify-center text-stone-400 text-sm border-2 border-dashed border-stone-100 rounded-xl">
              Selecciona un usuario de la lista para gestionar
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Usuario Seleccionado</span>
                <p className="font-mono text-stone-900 mt-1">{selectedUser.id}</p>
                {selectedUser.status === 'pending_deletion' && (
                  <p className="text-red-600 text-sm font-medium mt-2">
                    ⚠ Este usuario ya se encuentra en periodo de gracia para borrado.
                  </p>
                )}
              </div>

              {selectedUser.status !== 'pending_deletion' && (
                <div className="space-y-4 border-t border-stone-100 pt-4">
                  <h3 className="font-medium text-red-700 flex items-center gap-2">
                    <Trash2 size={18} /> Forzar Borrado (Soft Delete)
                  </h3>
                  <p className="text-sm text-stone-600">
                    Al confirmar, el usuario perderá el acceso inmediatamente. El borrado definitivo en cascada ocurrirá automáticamente en 14 días.
                  </p>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-stone-700">
                      Motivo de la acción (Obligatorio para auditoría):
                    </label>
                    <textarea 
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ej: Cuenta comprometida, solicitud legal, abuso de plataforma..."
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-red-400 text-sm min-h-[100px]"
                    />
                  </div>

                  {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}
                  
                  <button
                    onClick={handleAdminDeletion}
                    disabled={isLoading || !reason.trim()}
                    className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Procesando...' : 'Confirmar y Bloquear Cuenta'}
                  </button>
                </div>
              )}
            </div>
          )}

          {message && (
            <div className="mt-6 p-4 bg-green-50 text-green-800 border border-green-200 rounded-lg text-sm font-medium">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
