import {
    ResponsiveContainer, AreaChart, Area,
    XAxis, YAxis, Tooltip,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(2,9,15,0.95)',
            border: '1px solid rgba(0,255,255,0.2)',
            borderRadius: 6,
            padding: '8px 12px',
        }}>
            <p style={{ color: '#00ffff', fontSize: 10, fontWeight: 'bold', margin: 0 }}>{label}</p>
            <p style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}>{payload[0].value} vulns</p>
        </div>
    );
};

const VulnTrend = ({ data = [] }) => {
    const hasData = data.length > 0 && data.some(d => d.count > 0);
    const chartData = data.map(d => ({ date: d.date, count: d.count }));

    return (
        <div className="glass-card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                    Exposure Trend
                </p>
                <span className="flex items-center gap-1 text-[8px] text-gray-700 font-mono">
                    <TrendingUp className="h-2.5 w-2.5" />
                    14-Day
                </span>
            </div>

            <div style={{ height: 120 }}>
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                            <defs>
                                <linearGradient id="vulnGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00ffff" stopOpacity={0.18} />
                                    <stop offset="100%" stopColor="#00ffff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#374151', fontSize: 8 }}
                                axisLine={false}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fill: '#374151', fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                                tickCount={4}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#00ffff"
                                strokeWidth={2}
                                fill="url(#vulnGrad)"
                                dot={{ r: 3, fill: '#00ffff', strokeWidth: 0 }}
                                activeDot={{ r: 5 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center border border-dashed border-white/5 rounded">
                        <p className="text-[9px] font-black uppercase text-gray-700 tracking-widest">
                            No scan history yet
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VulnTrend;
