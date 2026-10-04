import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BrainCircuit, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface DiseaseRiskWidgetProps {
  riskScore: number; // 0..100
}

export const DiseaseRiskWidget: React.FC<DiseaseRiskWidgetProps> = ({ riskScore }) => {
  const normalizedRisk = Math.min(Math.max(riskScore, 0), 100);

  // Визначення колірної гами та статусу
  const getRiskDetails = (score: number) => {
    if (score >= 70) {
      return {
        color: '#f43f5e', // rose-500
        level: 'Високий ризик',
        recommendation: 'Увімкнути активну вентиляцію та осушення',
        icon: ShieldAlert,
        badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      };
    }
    if (score >= 40) {
      return {
        color: '#f59e0b', // amber-500
        level: 'Помірний ризик',
        recommendation: 'Слідкувати за конденсатом на листі',
        icon: ShieldAlert,
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      };
    }
    return {
      color: '#10b981', // emerald-500
      level: 'Оптимальний стан',
      recommendation: 'Розвиток патогенів малоймовірний',
      icon: CheckCircle2,
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    };
  };

  const risk = getRiskDetails(normalizedRisk);
  const Icon = risk.icon;

  const chartData = [
    { name: 'Risk', value: normalizedRisk },
    { name: 'Safe', value: 100 - normalizedRisk },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">ML Прогноз Захворювань</h3>
            <p className="text-xs text-slate-400">ONNX модель (фітофтороз / роса)</p>
          </div>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${risk.badgeBg}`}>
          {risk.level}
        </span>
      </div>

      <div className="relative h-44 flex items-center justify-center my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={65}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              <Cell fill={risk.color} />
              <Cell fill="#1e293b" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute top-[55%] flex flex-col items-center">
          <span className="text-3xl font-black text-white tracking-tight">
            {normalizedRisk.toFixed(0)}%
          </span>
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Індекс загрози
          </span>
        </div>
      </div>

      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-2.5">
        <Icon className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-300">{risk.recommendation}</p>
      </div>
    </div>
  );
};