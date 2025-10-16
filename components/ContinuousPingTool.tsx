import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ContinuousPing, PingUpdate } from '../services/speedTestService';
import { LineChart, Line, YAxis, ResponsiveContainer, XAxis, Text } from 'recharts';
import { ExpandIcon, CloseIcon } from '../constants';

interface LogEntry {
    type: 'reply' | 'timeout' | 'error' | 'info';
    message: string;
}

interface LatencyHistoryPoint {
    sequence: number;
    latency: number;
}

const presetTargets = [
    { name: 'Cloudflare DNS', target: '1.1.1.1' },
    { name: 'Google DNS', target: '8.8.8.8' },
    { name: 'Google.com', target: 'google.com' },
    { name: 'Facebook.com', target: 'facebook.com' },
];

const StatDisplay: React.FC<{ label: string; value: string | number; unit?: string }> = ({ label, value, unit }) => (
    <div className="bg-dark-bg p-3 rounded-lg flex-1">
        <div className="text-sm text-text-dark">{label}</div>
        <div className="text-xl font-bold text-text-light">
            {value}
            {unit && <span className="text-sm font-normal text-text-dark ml-1">{unit}</span>}
        </div>
    </div>
);

const LatencyDistributionChart: React.FC<{ distribution: Record<string, number>; total: number }> = ({ distribution, total }) => {
    const bars = [
        { label: '< 30ms', count: distribution.excellent, color: '#4ade80' },
        { label: '30-100ms', count: distribution.good, color: '#facc15' },
        { label: '100-250ms', count: distribution.fair, color: '#f97316' },
        { label: '> 250ms', count: distribution.poor, color: '#f87171' },
    ];

    return (
        <div className="mt-4">
            <h5 className="font-semibold text-text-light mb-3 text-center">Latency Distribution</h5>
            <div className="space-y-2 text-sm">
                {bars.map(bar => (
                    <div key={bar.label} className="flex items-center">
                        <span className="w-24 text-text-dark">{bar.label}</span>
                        <div className="flex-1 bg-dark-bg rounded-full h-4 overflow-hidden mr-2">
                            <div
                                className="h-4 rounded-full transition-all duration-300 ease-out"
                                style={{
                                    width: `${total > 0 ? (bar.count / total) * 100 : 0}%`,
                                    backgroundColor: bar.color
                                }}
                            />
                        </div>
                        <span className="w-12 text-right font-mono text-text-light">{bar.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RealTimeLatencyChart: React.FC<{ data: LatencyHistoryPoint[]; maxLatencyInHistory: number; }> = ({ data, maxLatencyInHistory }) => {
    
    const CustomDot = (props: any) => {
        const { cx, cy, payload } = props;

        // Show dot and label only for the peak value in the current dataset
        if (payload.latency === maxLatencyInHistory && maxLatencyInHistory > 0) {
            return (
                <g>
                    <circle cx={cx} cy={cy} r={4} stroke="#F6416C" strokeWidth={2} fill="#222831" />
                    <Text 
                        x={cx} 
                        y={cy - 12} 
                        textAnchor="middle" 
                        fill="#EEEEEE" 
                        fontSize="12px"
                        className="font-mono font-bold"
                    >
                        {Math.round(payload.latency)}
                    </Text>
                </g>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 5, left: -25, bottom: 5 }}>
                <YAxis
                    stroke="#BDBDBD"
                    domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 50)]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(tick) => String(Math.round(tick))}
                    allowDataOverflow={true}
                />
                <XAxis dataKey="sequence" hide />
                <Line
                    type="monotone"
                    dataKey="latency"
                    stroke="#00B8A9"
                    strokeWidth={2}
                    dot={<CustomDot />}
                    activeDot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    )
};


const ContinuousPingTool: React.FC = () => {
    const [targetUrl, setTargetUrl] = useState('one.one.one.one');
    const [isPinging, setIsPinging] = useState(false);
    const [pingLog, setPingLog] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState({ sent: 0, received: 0, lost: 0, min: Infinity, max: -Infinity, totalLatency: 0 });
    const [latencyDistribution, setLatencyDistribution] = useState({ excellent: 0, good: 0, fair: 0, poor: 0 });
    const [latencyHistory, setLatencyHistory] = useState<LatencyHistoryPoint[]>([]);
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    
    const pingTesterRef = useRef<ContinuousPing | null>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const latenciesRef = useRef<number[]>([]);
    const firstPingIgnored = useRef(false);

    const calculateJitter = (latencies: number[]): number => {
        if (latencies.length < 2) return 0;
        const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const variance = latencies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / latencies.length;
        return Math.sqrt(variance);
    };

    const handleUpdate = useCallback((update: PingUpdate) => {
        let logEntry: LogEntry;
        
        setStats(prev => {
            const newStats = { ...prev, sent: prev.sent + 1 };

            if (update.type === 'reply' && update.latency !== undefined) {
                // Always add to chart history
                const newHistoryPoint = { sequence: newStats.sent, latency: update.latency };
                setLatencyHistory(prevHistory => [...prevHistory.slice(-59), newHistoryPoint]);

                // But only include in stats after the first warm-up ping
                if (!firstPingIgnored.current) {
                    firstPingIgnored.current = true;
                    logEntry = { type: 'info', message: `First reply from ${targetUrl}: ${update.latency.toFixed(0)}ms (warm-up, excluded from stats)` };
                    newStats.received++; // still counts as received
                } else {
                    logEntry = { type: 'reply', message: `Reply from ${targetUrl}: time=${update.latency.toFixed(0)}ms` };
                    newStats.received++;
                    newStats.totalLatency += update.latency;
                    newStats.min = Math.min(newStats.min, update.latency);
                    newStats.max = Math.max(newStats.max, update.latency);
                    
                    latenciesRef.current = [...latenciesRef.current, update.latency];
                    if (latenciesRef.current.length > 100) latenciesRef.current.shift();

                    setLatencyDistribution(dist => {
                        const newDist = {...dist};
                        if (update.latency < 30) newDist.excellent++;
                        else if (update.latency < 100) newDist.good++;
                        else if (update.latency < 250) newDist.fair++;
                        else newDist.poor++;
                        return newDist;
                    });
                }
            } else if (update.type === 'timeout') {
                logEntry = { type: 'timeout', message: `Request timed out.` };
                newStats.lost++;
            } else {
                logEntry = { type: 'error', message: `Error: General network failure. Check console.` };
                newStats.lost++;
            }
            setPingLog(prevLog => [...prevLog.slice(-200), logEntry]);
            return newStats;
        });
    }, [targetUrl]);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [pingLog]);

    const startPing = () => {
        if (!targetUrl) {
            setPingLog([{ type: 'error', message: 'Please enter a valid URL or hostname.' }]);
            return;
        }
        firstPingIgnored.current = false;
        setIsPinging(true);
        setPingLog([{ type: 'info', message: `Pinging ${targetUrl}...` }]);
        setStats({ sent: 0, received: 0, lost: 0, min: Infinity, max: -Infinity, totalLatency: 0 });
        setLatencyDistribution({ excellent: 0, good: 0, fair: 0, poor: 0 });
        setLatencyHistory([]);
        latenciesRef.current = [];
        const tester = new ContinuousPing(targetUrl, handleUpdate);
        pingTesterRef.current = tester;
        tester.start();
    };

    const stopPing = () => {
        setIsPinging(false);
        if (pingTesterRef.current) {
            pingTesterRef.current.stop();
            pingTesterRef.current = null;
        }
        setPingLog(prev => [...prev, { type: 'info', message: `--- Ping statistics for ${targetUrl} stopped ---` }]);
    };
    
    const maxLatencyInHistory = latencyHistory.length > 0 ? Math.max(...latencyHistory.map(p => p.latency)) : 0;
    const avgLatency = stats.received > 0 ? (stats.totalLatency / stats.received).toFixed(0) : '0';
    const packetLoss = stats.sent > 0 ? ((stats.lost / stats.sent) * 100).toFixed(0) : '0';
    const jitter = calculateJitter(latenciesRef.current).toFixed(0);

    const getLogColor = (type: LogEntry['type']) => {
        switch(type) {
            case 'reply': return 'text-green-400';
            case 'timeout': return 'text-yellow-400';
            case 'error': return 'text-red-400';
            default: return 'text-text-dark';
        }
    };

    return (
        <div className="w-full p-4 bg-light-bg rounded-lg shadow-xl animate-fade-in">
            <h3 className="text-xl font-bold text-text-light mb-2 text-center">Live Ping</h3>
            <p className="text-xs text-text-dark text-center mb-4">
                Measures HTTP/S latency to a host, which can differ from a standard ICMP ping.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
                <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="e.g., google.com, 8.8.8.8, or any URL"
                    className="flex-grow bg-dark-bg border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-primary focus:border-primary"
                    disabled={isPinging}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !isPinging) startPing(); }}
                />
                <button
                    onClick={isPinging ? stopPing : startPing}
                    className={`px-6 py-2 font-bold rounded-md transition-colors duration-200 ${
                        isPinging 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-primary hover:bg-teal-500 text-white'
                    }`}
                >
                    {isPinging ? 'Stop Ping' : 'Start Ping'}
                </button>
            </div>
             <div className="flex flex-wrap gap-2 mb-4 items-center">
                <span className="text-xs text-text-dark">Gợi ý:</span>
                {presetTargets.map(preset => (
                    <button
                        key={preset.name}
                        onClick={() => !isPinging && setTargetUrl(preset.target)}
                        disabled={isPinging}
                        className="px-2 py-1 text-xs bg-dark-bg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-text-dark hover:text-text-light transition-colors"
                    >
                        {preset.name}
                    </button>
                ))}
            </div>
            
            <div ref={logContainerRef} className="bg-dark-bg text-sm p-4 rounded-md h-48 overflow-y-auto font-mono whitespace-pre-wrap break-all">
                {pingLog.length > 0 ? (
                    pingLog.map((log, index) => (
                        <p key={index} className={getLogColor(log.type)}>{log.message}</p>
                    ))
                ) : (
                    <p className="text-text-dark">Enter a host and click 'Start Ping' to begin.</p>
                )}
            </div>

            {stats.sent > 0 && (
                 <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Real-time Analysis */}
                    <div className="p-4 bg-dark-bg/50 rounded-md">
                        <div className="flex justify-center items-center relative mb-3">
                            <h4 className="font-bold text-text-light text-center">Real-time Analysis</h4>
                            <button 
                                onClick={() => setIsChartModalOpen(true)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-text-dark hover:text-primary transition-colors p-1"
                                aria-label="Expand chart"
                            >
                                <ExpandIcon />
                            </button>
                        </div>
                        <div className="h-32 mb-4">
                           <RealTimeLatencyChart data={latencyHistory} maxLatencyInHistory={maxLatencyInHistory} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <StatDisplay label="Minimum" value={stats.min === Infinity ? '--' : stats.min.toFixed(0)} unit="ms" />
                            <StatDisplay label="Maximum" value={stats.max === -Infinity ? '--' : stats.max.toFixed(0)} unit="ms" />
                            <StatDisplay label="Average" value={avgLatency} unit="ms" />
                            <StatDisplay label="Jitter" value={jitter} unit="ms" />
                        </div>
                    </div>
                    {/* Session Summary */}
                    <div className="p-4 bg-dark-bg/50 rounded-md flex flex-col">
                        <h4 className="font-bold text-text-light mb-3 text-center">Session Summary</h4>
                        <div className="grid grid-cols-3 gap-3 text-center mb-4">
                            <StatDisplay label="Sent" value={stats.sent} />
                            <StatDisplay label="Received" value={stats.received} />
                            <StatDisplay label="Lost" value={`${stats.lost} (${packetLoss}%)`} />
                        </div>
                        <div className="flex-grow flex flex-col justify-center">
                           <LatencyDistributionChart distribution={latencyDistribution} total={stats.received} />
                        </div>
                    </div>
                 </div>
            )}
             <div className="mt-6">
                <details className="bg-dark-bg/50 p-3 rounded-lg cursor-pointer">
                    <summary className="font-semibold text-text-light outline-none">Gợi ý cho bạn: Làm sao để đọc kết quả?</summary>
                    <div className="mt-3 text-sm text-text-dark space-y-2">
                        <p><strong className="text-text-light">Latency (Ping):</strong> Là thời gian phản hồi của kết nối. Ping thấp (dưới 50ms) là rất tốt cho chơi game và gọi video. Ping cao hơn (trên 150ms) có thể gây ra độ trễ (lag).</p>
                        <p><strong className="text-text-light">Jitter:</strong> Là độ thiếu ổn định của ping. Jitter cao có nghĩa là ping của bạn thay đổi liên tục, gây ra hiện tượng giật, lag đột ngột. Jitter dưới 20ms là lý tưởng.</p>
                        <p><strong className="text-text-light">Lost (Mất gói):</strong> Là tỷ lệ % các gói dữ liệu bị mất trên đường truyền. Bất kỳ tỷ lệ mất gói nào (trên 0%) đều không tốt và có thể gây ra rớt mạng, hình ảnh/âm thanh bị vỡ.</p>
                    </div>
                </details>
            </div>
            {isChartModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
                    onClick={() => setIsChartModalOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="chart-modal-title"
                >
                    <div 
                        className="bg-light-bg w-[95vw] h-[90vh] max-w-7xl p-6 rounded-xl shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 id="chart-modal-title" className="text-2xl font-bold text-text-light">Real-time Latency Analysis</h3>
                            <button 
                                onClick={() => setIsChartModalOpen(false)}
                                className="text-text-dark hover:text-primary transition-colors"
                                aria-label="Close detailed view"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="flex-grow">
                            <RealTimeLatencyChart data={latencyHistory} maxLatencyInHistory={maxLatencyInHistory} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContinuousPingTool;