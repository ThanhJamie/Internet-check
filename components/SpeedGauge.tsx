
import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface SpeedGaugeProps {
  speed: number;
  maxSpeed: number;
}

const SpeedGauge: React.FC<SpeedGaugeProps> = ({ speed, maxSpeed }) => {
  const data = [{ name: 'speed', value: speed }];

  const endAngle = 90 - (speed / maxSpeed) * 360;
  
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
          barSize={20}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, maxSpeed]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background
            dataKey="value"
            angleAxisId={0}
            fill="url(#speedGradient)"
            cornerRadius={10}
            className="transition-all duration-300 ease-out"
          />
          <defs>
            <linearGradient id="speedGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00B8A9" />
              <stop offset="100%" stopColor="#F6416C" />
            </linearGradient>
          </defs>
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-5xl md:text-6xl font-bold text-text-light transition-all duration-300">
          {speed.toFixed(1)}
        </span>
        <span className="text-lg text-text-dark">Mbps</span>
      </div>
    </div>
  );
};

export default SpeedGauge;
