import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

interface HistoryData {
    time: number;
    ping?: number;
    download?: number;
    upload?: number;
}

interface HistoryChartProps {
    data: HistoryData[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-light-bg/80 backdrop-blur-sm p-3 border border-gray-500 rounded-md shadow-lg text-text-light">
        <p className="label">{`Time: ${label.toFixed(2)}s`}</p>
        {payload.map((pld: any) => (
          <p key={pld.dataKey} style={{ color: pld.color }}>
            {`${pld.name}: ${pld.value.toFixed(2)} ${pld.unit}`}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

const HistoryChart: React.FC<HistoryChartProps> = ({ data }) => {
  // Find max values for y-axis domains
  const maxSpeed = Math.max(...data.map(d => Math.max(d.download || 0, d.upload || 0)));
  const maxPing = Math.max(...data.map(d => d.ping || 0));

  return (
    <div className="w-full max-w-4xl mt-8 bg-light-bg p-4 rounded-lg shadow-xl">
        <h3 className="text-xl font-bold text-text-light mb-4 text-center">Performance Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis 
                    dataKey="time" 
                    type="number" 
                    domain={['dataMin', 'dataMax']}
                    stroke="#BDBDBD"
                    tickFormatter={(tick) => tick.toFixed(1)}
                    label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#BDBDBD' }}
                />
                <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    stroke="#00B8A9" 
                    domain={[0, dataMax => Math.ceil(dataMax * 1.2)]}
                    label={{ value: 'Speed (Mbps)', angle: -90, position: 'insideLeft', fill: '#00B8A9' }}
                />
                <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#F6416C"
                    domain={[0, dataMax => Math.ceil(dataMax * 1.2)]}
                    label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight', fill: '#F6416C' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#EEEEEE' }}/>
                <Line yAxisId="left" type="monotone" dataKey="download" name="Download" stroke="#00B8A9" strokeWidth={2} dot={false} unit="Mbps" />
                <Line yAxisId="left" type="monotone" dataKey="upload" name="Upload" stroke="#38bdf8" strokeWidth={2} dot={false} unit="Mbps" />
                <Line yAxisId="right" type="step" dataKey="ping" name="Ping" stroke="#F6416C" strokeWidth={2} dot={false} unit="ms" />
            </ComposedChart>
        </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;
