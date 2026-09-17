import { useState } from 'react';
import TodayView from './TodayView';
import ProgressView from './ProgressView';
import GoalsView from './GoalsView';
import ChatView from './ChatView';
import SettingsView from './SettingsView';
import MoodTrackerView from './MoodTrackerView';
import PanicButton from './PanicButton';

export default function Dashboard() {
  const [view, setView] = useState<'today' | 'mood' | 'progress' | 'goals' | 'chat' | 'settings'>('today');

  const buttonClass = (v: string) => 
    `px-4 py-2 rounded-lg transition-colors ${view === v ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`;

  return (
    <div className="max-w-4xl mx-auto p-6 relative">
      <PanicButton />
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-6 text-stone-900">Dashboard</h1>
        <nav className="flex flex-wrap gap-3">
          <button className={buttonClass('today')} onClick={() => setView('today')}>Hoy</button>
          <button className={buttonClass('mood')} onClick={() => setView('mood')}>Estado de Ánimo</button>
          <button className={buttonClass('progress')} onClick={() => setView('progress')}>Progreso</button>
          <button className={buttonClass('goals')} onClick={() => setView('goals')}>Mis Metas</button>
          <button className={buttonClass('chat')} onClick={() => setView('chat')}>Asistente</button>
          <button className={buttonClass('settings')} onClick={() => setView('settings')}>Ajustes</button>
        </nav>
      </header>
      
      <main className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 min-h-[600px]">
        {view === 'today' && (
          <TodayView 
            onNavigateToChat={() => setView('chat')} 
            onNavigateToMood={() => setView('mood')}
          />
        )}
        {view === 'mood' && <MoodTrackerView />}
        {view === 'progress' && <ProgressView />}
        {view === 'goals' && <GoalsView />}
        {view === 'chat' && <ChatView />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
