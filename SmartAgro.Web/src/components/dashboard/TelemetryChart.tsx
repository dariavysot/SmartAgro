import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export interface ChartPoint {
  time: string;
  temperature: number;
  humidity: number;
  co2: number;
}

interface TelemetryChartProps {
  data: ChartPoint[];
  maxTempThreshold?: number; // верхня межа (за замовчуванням 32°C)
  minTempThreshold?: number; // нижня межа (за замовчуванням 18°C)
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  data,
  maxTempThreshold = 32,
  minTempThreshold = 18,
}) => {
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg h-full flex flex-col justify-between transition-colors">
      {/* Заголовок і легенда */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Динаміка мікроклімату</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Порівняння показників у реальному часі на різних шкалах</p>
        </div>

        {/* Легенда */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-700 dark:text-slate-300">Температура (°C)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span className="text-slate-700 dark:text-slate-300">Вологість (%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-700 dark:text-slate-300">CO₂ (ppm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-rose-500" />
            <span className="text-slate-700 dark:text-slate-300">Межі норми</span>
          </div>
        </div>
      </div>

      {/* Контейнер графіка */}
      <div className="flex-1 w-full min-h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 5, left: -5, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {/* Адаптивна сітка */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDarkMode ? '#1e293b' : '#e2e8f0'}
              vertical={false}
            />

            <XAxis
              dataKey="time"
              stroke={isDarkMode ? '#64748b' : '#94a3b8'}
              fontSize={11}
              tickLine={false}
            />

            {/* Ліва вісь: Температура */}
            <YAxis
              yAxisId="left-temp"
              orientation="left"
              stroke="#10b981"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#10b981', strokeWidth: 1 }}
              width={50}
              tickMargin={6}
              domain={[15, 40]}
              tickFormatter={(v) => `${v}°C`}
            />

            {/* Права вісь: Вологість */}
            <YAxis
              yAxisId="right-hum"
              orientation="right"
              stroke="#06b6d4"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={28}
              tickMargin={2}
              domain={[20, 100]}
              tickFormatter={(v) => `${v}%`}
            />

            {/* Вісь CO2: прихована */}
            <YAxis
              yAxisId="right-co2"
              orientation="right"
              hide={true}
              domain={[300, 1600]}
            />

            {/* Адаптивний тултіп під тему */}
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: isDarkMode ? '#f8fafc' : '#0f172a',
                boxShadow: isDarkMode ? 'none' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value, name) => {
                const label = String(name ?? '');
                if (label.includes('Температура')) return [`${value} °C`, label];
                if (label.includes('Вологість')) return [`${value} %`, label];
                if (label.includes('CO₂')) return [`${value} ppm`, label];
                return [value, label];
              }}
            />

            {/* Області графіків */}
            <Area
              yAxisId="left-temp"
              type="monotone"
              dataKey="temperature"
              name="Температура"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#tempGradient)"
              isAnimationActive={false}
            />

            <Area
              yAxisId="right-hum"
              type="monotone"
              dataKey="humidity"
              name="Вологість"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#humGradient)"
              isAnimationActive={false}
            />

            <Area
              yAxisId="right-co2"
              type="monotone"
              dataKey="co2"
              name="Рівень CO₂"
              stroke="#a855f7"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#co2Gradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};