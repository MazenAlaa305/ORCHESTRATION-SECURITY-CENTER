import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale,
    PointElement, LineElement,
    Title, Tooltip, Filler,
} from 'chart.js';
import { TrendingUp } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const VulnTrend = ({ data = [] }) => {
    const hasData = data.length > 0 && data.some(d => d.count > 0);

    const chartData = {
        labels: data.map(d => d.date),
        datasets: [{
            label: 'Vulnerabilities',
            data: data.map(d => d.count),
            borderColor: '#00ffff',
            backgroundColor: (ctx) => {
                const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 120);
                gradient.addColorStop(0, 'rgba(0,255,255,0.18)');
                gradient.addColorStop(1, 'rgba(0,255,255,0.00)');
                return gradient;
            },
            fill: 'origin',
            tension: 0.45,
            pointRadius: 3,
            pointBackgroundColor: '#00ffff',
            pointHoverRadius: 5,
            borderWidth: 2,
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(2,9,15,0.95)',
                titleColor: '#00ffff',
                bodyColor: '#9ca3af',
                borderColor: 'rgba(0,255,255,0.2)',
                borderWidth: 1,
                titleFont: { size: 10, weight: 'bold' },
                bodyFont:  { size: 11 },
                cornerRadius: 6,
                padding: 10,
                callbacks: {
                    title: items => items[0].label,
                    label: item  => ` ${item.parsed.y} vulns`,
                },
            },
        },
        scales: {
            x: {
                display: true,
                grid: { display: false },
                ticks: {
                    color: '#374151',
                    font: { size: 8 },
                    maxTicksLimit: 5,
                },
                border: { display: false },
            },
            y: {
                display: true,
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: {
                    color: '#374151',
                    font: { size: 9 },
                    stepSize: 1,
                    maxTicksLimit: 4,
                },
                border: { display: false },
            },
        },
    };

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
                    <Line data={chartData} options={options} />
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
