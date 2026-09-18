import { useState, useEffect } from 'react';
import { HeartHandshake, Users, Copy, CheckCircle2, MessageCircle, Plus, Trash2, ShieldCheck, Sparkles } from 'lucide-react';

interface VitaminContact {
  id: string;
  name: string;
  relationship: string; // ej. Amigo de confianza, Hermana, Pareja, Mentor
  notes?: string;
}

export default function VitaminPersonExercise() {
  const [contacts, setContacts] = useState<VitaminContact[]>([]);
  const [newName, setNewName] = useState('');
  const [newRel, setNewRel] = useState('');
  const [selectedContactName, setSelectedContactName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_vitamin_contacts');
      if (saved) {
        const parsed = JSON.parse(saved);
        setContacts(parsed);
        if (parsed.length > 0) {
          setSelectedContactName(parsed[0].name);
        }
      } else {
        // Preset sample contacts
        const defaultContacts: VitaminContact[] = [
          { id: '1', name: 'Mamá / Papá', relationship: 'Familia' },
          { id: '2', name: 'Amigo/a cercano', relationship: 'Amistad de confianza' }
        ];
        setContacts(defaultContacts);
        setSelectedContactName(defaultContacts[0].name);
      }
    } catch (e) {
      console.error('Error reading vitamin contacts:', e);
    }
  }, []);

  const saveContacts = (updated: VitaminContact[]) => {
    setContacts(updated);
    try {
      localStorage.setItem('app_vitamin_contacts', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving vitamin contacts:', e);
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const item: VitaminContact = {
      id: Date.now().toString(),
      name: newName.trim(),
      relationship: newRel.trim() || 'Persona de confianza'
    };
    const updated = [...contacts, item];
    saveContacts(updated);
    if (!selectedContactName) setSelectedContactName(item.name);
    setNewName('');
    setNewRel('');
  };

  const handleDeleteContact = (id: string) => {
    const updated = contacts.filter(c => c.id !== id);
    saveContacts(updated);
    if (updated.length > 0) {
      setSelectedContactName(updated[0].name);
    } else {
      setSelectedContactName('');
    }
  };

  const targetName = selectedContactName || '[Nombre]';

  const messageTemplates = [
    {
      id: 'low-energy-hello',
      title: 'Saludo con baja energía (sin presión de responder)',
      text: `Hola ${targetName}, hoy ando con poca energía mental pero me acordé de ti y quería desearte un lindo día. No te preocupes por responder largo, solo quería que supieras que te aprecio mucho.`
    },
    {
      id: 'quiet-company',
      title: 'Compañía en silencio o plan tranquilo',
      text: `Hola ${targetName}, hoy no me siento con muchos ánimos para conversar mucho, pero me haría mucho bien un ratito de compañía tranquila o tomar un café en calma si estás libre en algún momento. Sin presión alguna.`
    },
    {
      id: 'gratitude-safe-space',
      title: 'Agradecimiento por ser un lugar seguro',
      text: `Hola ${targetName}, estaba reflexionando hoy y quería agradecerte por ser siempre un espacio seguro para mí, donde puedo ser honesto/a sin máscaras. Gracias de verdad.`
    },
    {
      id: 'social-boundary',
      title: 'Límite afectuoso para proteger la batería emocional',
      text: `Hola ${targetName}, me encantaría acompañarte pero hoy mi batería emocional está bastante baja y necesito descansar en casa para recuperarme. ¿Te parece si coordinamos con calma en unos días? Un abrazo fuerte.`
    }
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-6 text-stone-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
              <HeartHandshake className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Neurobiología del Apego Seguro • Marian Rojas Estapé
            </span>
          </div>
          <h4 className="text-lg font-bold text-stone-900">
            Círculo de Seguridad y Red de "Personas Vitamina"
          </h4>
          <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
            Una <em>persona vitamina</em> es aquella que calma tu sistema nervioso, frena la secreción de cortisol y te permite ser vulnerable sin miedo al juicio. Registrar a tus personas de confianza te ayuda a romper el aislamiento cuando más lo necesitas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Register safe contacts */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <h5 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-700" />
              <span>Tus Personas de Confianza ({contacts.length})</span>
            </h5>
            <p className="text-2xs text-stone-500">
              Identifica 1 a 3 personas con quienes puedes ser honesto/a sobre tu estado anímico.
            </p>

            <form onSubmit={handleAddContact} className="space-y-2 pt-1">
              <input
                type="text"
                required
                placeholder="Nombre o apodo..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
              <input
                type="text"
                placeholder="Vínculo (ej: Amigo/a, Hermano, Pareja)..."
                value={newRel}
                onChange={e => setNewRel(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Persona Vitamina</span>
              </button>
            </form>

            <div className="space-y-2 pt-2 border-t border-stone-200 max-h-56 overflow-y-auto">
              {contacts.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedContactName(c.name)}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                    selectedContactName === c.name
                      ? 'bg-amber-50 border-amber-400 font-bold text-amber-950 shadow-2xs'
                      : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-2xs text-stone-400">{c.relationship}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedContactName === c.name && (
                      <span className="text-3xs bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full font-semibold">
                        Activo
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteContact(c.id);
                      }}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded-md transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pre-drafted gentle messages ready to send */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Plantillas de Micro-Mensajes Listas para Enviar a {targetName}</span>
            </h5>
            <span className="text-2xs text-stone-500">Haz clic en copiar o enviar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {messageTemplates.map(tmpl => (
              <div 
                key={tmpl.id}
                className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <span className="text-xs font-bold text-stone-900 leading-tight block">
                    {tmpl.title}
                  </span>
                  <div className="p-3 rounded-lg bg-white border border-stone-200 text-xs text-stone-700 italic leading-relaxed">
                    "{tmpl.text}"
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200">
                  <button
                    onClick={() => handleCopy(tmpl.id, tmpl.text)}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedId === tmpl.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-300" />
                        <span>Copiar texto</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(tmpl.text)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Recuerda:</strong> Pedir apoyo en momentos de desánimo no te convierte en una carga; fortalece la confianza y la intimidad mutua.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
