import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { MetricStatus } from '../../types/telemetry';

interface MetricCardProps {
  title: string;
  value: number | string;
  unit: string;
  icon: LucideIcon;
  status: MetricStatus;
  statusText: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  status,
  statusText,
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'critical':
        return {
          border: 'border-rose-500/40 shadow-rose-950/40',
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          pulse: 'bg-rose-500',
        };
      case 'warning':
        return {
          border: 'border-amber-500/40 shadow-amber-950/40',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          pulse: 'bg-amber-500',
        };
      case 'normal':
      default:
        return {
          border: 'border-emerald-500/20 shadow-emerald-950/20',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          pulse: 'bg-emerald-500',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div
      className={`bg-slate-900 border ${styles.border} rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all duration-300 hover:scale-[1.01]`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${styles.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-slate-300">{title}</span>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${styles.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${styles.pulse}`} />
          {statusText}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-3xl font-extrabold text-white tracking-tight">
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="text-sm text-slate-400 font-medium">{unit}</span>
      </div>
    </div>
  );
};