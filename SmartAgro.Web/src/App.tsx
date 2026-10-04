import { Sprout } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 bg-slate-800 px-6 py-4 rounded-2xl shadow-xl border border-emerald-500/30">
        <Sprout className="w-10 h-10 text-emerald-400 animate-pulse" />
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">SmartAgro Dashboard</h1>
          <p className="text-slate-400 text-sm">React + Vite + TypeScript + Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
}