import { useState } from 'react';
import { Calendar, Smile, TrendingUp, Target, Bot, Settings } from 'lucide-react';
import TodayView from './TodayView';
import ProgressView from './ProgressView';
import GoalsView from './GoalsView';
import ChatView from './ChatView';
import SettingsView from './SettingsView';
import MoodTrackerView from './MoodTrackerView';
import PanicButton from './PanicButton';
import corporateLogo from '../public/Logo corporativo-SF.png';

export default function Dashboard() {
  const [view, setView] = useState<'today' | 'mood' | 'progress' | 'goals' | 'chat' | 'settings'>('today');
  const [moodTab, setMoodTab] = useState<'charts' | 'patterns' | 'support' | 'history'>('charts');

  const handleNavigateToMood = (tab?: 'charts' | 'patterns' | 'support' | 'history') => {
    if (tab) setMoodTab(tab);
    setView('mood');
  };

  interface NavItem {
    id: 'today' | 'mood' | 'progress' | 'goals' | 'chat' | 'settings';
    label: string;
    icon: typeof Calendar;
    action?: () => void;
  }

  const navItems: NavItem[] = [
    { id: 'today', label: 'Hoy', icon: Calendar },
    { id: 'mood', label: 'Estado de Ánimo', icon: Smile, action: () => { setMoodTab('charts'); setView('mood'); } },
    { id: 'progress', label: 'Progreso', icon: TrendingUp },
    { id: 'goals', label: 'Mis Metas', icon: Target },
    { id: 'chat', label: 'Asistente', icon: Bot },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="max-w-4xl mx-auto px-3 py-3 sm:px-6 sm:py-6 relative min-h-screen flex flex-col">
      <PanicButton />
      
      {/* Header bar: Brand title + corporate logo aligned symmetrically on desktop & mobile */}
      <header className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-5">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <img
              id="corporate-header-logo"
              src={corporateLogo}
              alt="Logo Corporativo Mantén la Ruta"
              referrerPolicy="no-referrer"
              className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain select-none transition-transform hover:scale-105 duration-200 shrink-0"
            />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight">
                Mantén la Ruta
              </h1>
              <p className="text-xs text-stone-500 hidden sm:block">
                Tu camino hacia el bienestar emocional y tus metas
              </p>
            </div>
          </div>
        </div>

        {/* Desktop-grade horizontal pill navigation (smooth scrollable on mobile, no awkward line-wrapping) */}
        <div className="bg-stone-100/90 p-1 sm:p-1.5 rounded-2xl border border-stone-200/80 shadow-2xs">
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      setView(item.id as any);
                    }
                  }}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isActive 
                      ? 'bg-stone-900 text-white shadow-xs scale-100' 
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>
      
      {/* Main content container with desktop-grade spacing on mobile */}
      <main className="bg-white p-3.5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-stone-100 flex-1 min-h-[520px] sm:min-h-[600px]">
        {view === 'today' && (
          <TodayView 
            onNavigateToChat={() => setView('chat')} 
            onNavigateToMood={handleNavigateToMood}
          />
        )}
        {view === 'mood' && <MoodTrackerView initialTab={moodTab} />}
        {view === 'progress' && <ProgressView />}
        {view === 'goals' && <GoalsView />}
        {view === 'chat' && <ChatView />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
