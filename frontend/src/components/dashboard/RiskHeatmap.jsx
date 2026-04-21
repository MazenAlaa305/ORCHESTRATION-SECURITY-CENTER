import { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { hierarchy, treemap } from 'd3-hierarchy';
import { easeCubicOut } from 'd3-ease';
import 'd3-transition';

const SEV_COLORS = {
    critical: '#ff0055',
    high:     '#ff9900',
    medium:   '#00ffff',
    low:      '#00ff88',
};

const RiskHeatmap = ({ data = [] }) => {
    const containerRef = useRef(null);
    const svgRef       = useRef(null);
    const [dims, setDims] = useState({ width: 600, height: 220 });

    // Responsive container width via ResizeObserver
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            for (const e of entries) {
                setDims({ width: Math.floor(e.contentRect.width), height: 220 });
            }
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const filtered = (data || []).filter(d => d.value > 0);
        const svg = select(svgRef.current);
        svg.selectAll('*').remove();

        if (!filtered.length) return;

        const { width, height } = dims;
        svg
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('background', 'transparent');

        const root = hierarchy({ children: filtered })
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        treemap().size([width, height]).padding(3)(root);

        const cell = svg.selectAll('g')
            .data(root.leaves())
            .join('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);

        // Background rect with enter animation
        cell.append('rect')
            .attr('width',  d => Math.max(0, d.x1 - d.x0))
            .attr('height', d => Math.max(0, d.y1 - d.y0))
            .attr('fill',   d => SEV_COLORS[d.data.severity] || '#444')
            .attr('opacity', 0)
            .attr('rx', 3)
            .attr('stroke', 'rgba(0,0,0,0.3)')
            .attr('stroke-width', 1)
          .transition().duration(400).ease(easeCubicOut)
            .attr('opacity', 0.75);

        // Count label (only on large enough cells)
        cell.append('text')
            .attr('x', 7)
            .attr('y', 15)
            .text(d => {
                const w = d.x1 - d.x0;
                const h = d.y1 - d.y0;
                return w > 50 && h > 24 ? `${d.data.name} (${d.data.value})` : '';
            })
            .attr('font-size', '10px')
            .attr('font-weight', '800')
            .attr('fill', '#fff')
            .attr('opacity', 0.9)
            .attr('text-transform', 'uppercase')
            .style('pointer-events', 'none');

    }, [data, dims]);

    const hasData = data && data.some(d => d.value > 0);

    return (
        <div className="glass-card p-4 w-full flex flex-col" ref={containerRef}>
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3 shrink-0">
                Vulnerability Severity Distribution
            </p>
            {hasData ? (
                <svg ref={svgRef} className="w-full rounded overflow-hidden" style={{ height: dims.height }} />
            ) : (
                <div
                    className="flex items-center justify-center border border-dashed border-white/5 rounded"
                    style={{ height: dims.height }}
                >
                    <p className="text-[9px] font-black uppercase text-gray-700 tracking-widest">
                        No Open Vulnerabilities
                    </p>
                </div>
            )}
        </div>
    );
};

export default RiskHeatmap;
