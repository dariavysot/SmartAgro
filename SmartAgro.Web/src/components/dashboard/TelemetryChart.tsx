import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export interface ChartPoint {
  time: string;
  temperature: number;
  humidity: number;
  co2: number;
}

interface TelemetryChartProps {
  data: ChartPoint[];
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ data }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg h-full flex flex-col justify-between">
      {/* Заголовок і легенда */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Динаміка мікроклімату</h3>
          <p className="text-xs text-slate-400">Порівняння показників у реальному часі на різних шкалах</p>
        </div>

        {/* Легенда */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Температура (°C)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Вологість (%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            <span className="text-slate-300">CO₂ (ppm)</span>
          </div>
        </div>
      </div>

      {/* Контейнер графіка */}
      <div className="flex-1 w-full min-h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 5, left: -5, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c084fc" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />

            {/* Ліва вісь: Температура з вертикальною лінією */}
            <YAxis
              yAxisId="left-temp"
              orientation="left"
              stroke="#34d399"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#34d399', strokeWidth: 1 }}
              width={50}
              tickMargin={6}
              domain={[15, 40]}
              tickFormatter={(v) => `${v}°C`}
            />

            {/* Права вісь: Вологість присунута максимально праворуч */}
            <YAxis
              yAxisId="right-hum"
              orientation="right"
              stroke="#22d3ee"
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

            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: '#f8fafc',
              }}
              formatter={(value, name) => {
                const label = String(name ?? '');
                if (label.includes('Температура')) return [`${value} °C`, label];
                if (label.includes('Вологість')) return [`${value} %`, label];
                if (label.includes('CO₂')) return [`${value} ppm`, label];
                return [value, label];
              }}
            />

            <Area
              yAxisId="left-temp"
              type="monotone"
              dataKey="temperature"
              name="Температура"
              stroke="#34d399"
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
              stroke="#22d3ee"
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
              stroke="#c084fc"
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