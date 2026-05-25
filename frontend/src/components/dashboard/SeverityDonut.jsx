import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useRealTime } from '../../context/RealTimeContext';
import EmptyState from '../ui/EmptyState';

const COLORS = {
    CRITICAL: '#ff0055',
    HIGH:     '#ff6a00',
    MEDIUM:   '#ffaa00',
    LOW:      '#00ffff',
    INFO:     '#7e8fa3',
};

/**
 * Animated donut chart of finding severities.
 * Reads live counts from RealTimeContext.
 */
export default function SeverityDonut() {
    const { state } = useRealTime();
    const counts = state?.kpi?.counts || {};
    const data = [
        { name: 'CRITICAL', value: counts.critical || 0 },
        { name: 'HIGH',     value: counts.high     || 0 },
        { name: 'MEDIUM',   value: counts.medium   || 0 },
        { name: 'LOW',      value: counts.low      || 0 },
        { name: 'INFO',     value: counts.info     || 0 },
    ].filter((d) => d.value > 0);

    if (data.length === 0) {
        return (
            <EmptyState
                title="No findings yet"
                message="Trigger a scan to populate severity distribution."
                icon="🛡️"
            />
        );
    }

    return (
        <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        isAnimationActive
                        animationBegin={120}
                        animationDuration={900}
                        animationEasing="ease-out"
                        isUpdateAnimationActive={false}
                    >
                        {data.map((entry) => (
                            <Cell key={entry.name} fill={COLORS[entry.name]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            background: '#0a0a0a',
                            border: '1px solid rgba(0,255,255,0.4)',
                            color: '#e6f2ff',
                        }}
                    />
                    <Legend wrapperStyle={{ color: '#aac4d6', fontSize: 12 }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
