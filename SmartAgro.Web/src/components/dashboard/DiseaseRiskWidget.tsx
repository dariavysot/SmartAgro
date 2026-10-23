import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  BrainCircuit, 
  ShieldAlert, 
  CheckCircle2, 
  Droplets, 
  Wind, 
  Cloud, 
  Layers 
} from 'lucide-react';
import type { RiskBreakdown } from '../../types/telemetry';

interface DiseaseRiskWidgetProps {
  riskScore: number; // 0..100
  breakdown?: RiskBreakdown;
}

export const DiseaseRiskWidget: React.FC<DiseaseRiskWidgetProps> = ({ riskScore, breakdown }) => {
  const normalizedRisk = Math.min(Math.max(riskScore, 0), 100);

  const factors = {
    fungal: breakdown?.fungalDiseaseRisk ?? normalizedRisk,
    vpd: breakdown?.vpdStressRisk ?? Math.min(Math.round(normalizedRisk * 0.75), 100),
    co2: breakdown?.co2InefficiencyRisk ?? Math.min(Math.round(normalizedRisk * 0.5), 100),
    hypoxia: breakdown?.rootHypoxiaRisk ?? Math.min(Math.round(normalizedRisk * 0.4), 100),
  };

  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const getRiskDetails = (score: number) => {
    if (score >= 70) {
      return {
        color: '#f43f5e',
        level: 'Високий ризик',
        recommendation: 'Увімкнути активну вентиляцію та осушення повітря',
        icon: ShieldAlert,
        badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30',
        alertBoxBg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300',
      };
    }
    if (score >= 40) {
      return {
        color: '#f59e0b',
        level: 'Помірний ризик',
        recommendation: 'Слідкувати за конденсатом і балансом VPD',
        icon: ShieldAlert,
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30',
        alertBoxBg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300',
      };
    }
    return {
      color: '#10b981',
      level: 'Оптимальний стан',
      recommendation: 'Розвиток патогенів та фізіологічний стрес малоймовірні',
      icon: CheckCircle2,
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30',
      alertBoxBg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300',
    };
  };

  const risk = getRiskDetails(normalizedRisk);
  const Icon = risk.icon;

  const chartData = [
    { name: 'Risk', value: normalizedRisk },
    { name: 'Safe', value: 100 - normalizedRisk },
  ];

  const getFactorColor = (val: number) => {
    if (val >= 70) return 'bg-rose-500';
    if (val >= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg flex flex-col justify-between h-full transition-colors">
      <div>
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">ML Аналіз Ризиків</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Багатофакторна ONNX модель</p>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${risk.badgeBg}`}>
            {risk.level}
          </span>
        </div>

        {/* Спідометр інтегрального ризику */}
        <div className="relative h-40 flex items-center justify-center my-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                <Cell fill={risk.color} />
                <Cell fill={isDarkMode ? '#1e293b' : '#e2e8f0'} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute top-[52%] flex flex-col items-center">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {normalizedRisk.toFixed(0)}%
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Індекс загрози
            </span>
          </div>
        </div>

        {/* Деталізація 4 факторів */}
        <div className="space-y-2.5 mt-1 pt-3 border-t border-slate-200 dark:border-slate-800/80">
          {/* 1. Грибкові захворювання */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Droplets className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                Фітофтороз / Роса
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{factors.fungal.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getFactorColor(factors.fungal)}`} 
                style={{ width: `${factors.fungal}%` }}
              />
            </div>
          </div>

          {/* 2. Стрес VPD */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Wind className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                Стрес транспірації (VPD)
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{factors.vpd.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getFactorColor(factors.vpd)}`} 
                style={{ width: `${factors.vpd}%` }}
              />
            </div>
          </div>

          {/* 3. CO2 */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Cloud className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                Дисбаланс CO₂
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{factors.co2.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getFactorColor(factors.co2)}`} 
                style={{ width: `${factors.co2}%` }}
              />
            </div>
          </div>

          {/* 4. Гіпоксія */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Layers className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                Гіпоксія коренів
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{factors.hypoxia.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getFactorColor(factors.hypoxia)}`} 
                style={{ width: `${factors.hypoxia}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Рекомендація знизу: адаптивний пастельний бейдж під статус */}
      <div className={`p-3 rounded-xl border flex items-start gap-2.5 mt-4 transition-colors ${risk.alertBoxBg}`}>
        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-xs font-medium">{risk.recommendation}</p>
      </div>
    </div>
  );
};