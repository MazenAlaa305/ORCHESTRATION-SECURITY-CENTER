import React, { useEffect, useMemo, useState } from 'react';
import { networkService } from '../../services/api';
import EmptyState from '../ui/EmptyState';

/**
 * Subnet-grouped exposure heat-map.
 *
 * Each square is one asset; colour represents its risk band.
 * Assets are grouped under their /24 subnet for at-a-glance comparison.
 */
function colorFor(score) {
    if (score >= 80) return '#ff0055';
    if (score >= 60) return '#ff6a00';
    if (score >= 30) return '#ffaa00';
    if (score > 0)   return '#00ffff';
    return '#2a3947';
}

export default function ExposureMap() {
    const [assets, setAssets] = useState(null);

    useEffect(() => {
        let cancelled = false;
        networkService
            .getAssets()
            .then((r) => { if (!cancelled) setAssets(r.data || []); })
            .catch(() => { if (!cancelled) setAssets([]); });
        return () => { cancelled = true; };
    }, []);

    const grouped = useMemo(() => {
        if (!assets) return null;
        const map = {};
        assets.forEach((a) => {
            const ip = a.ip_address || a.ip || '0.0.0.0';
            const subnet = ip.split('.').slice(0, 3).join('.') + '.0/24';
            if (!map[subnet]) map[subnet] = [];
            map[subnet].push(a);
        });
        return map;
    }, [assets]);

    if (assets === null) {
        return <div style={{ color: '#7e8fa3', padding: '0.5rem' }}>Loading…</div>;
    }
    if (assets.length === 0) {
        return (
            <EmptyState
                title="No exposure data"
                message="Run a network discovery scan to populate the exposure map."
                icon="🗺️"
            />
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(grouped).map(([subnet, list]) => (
                <div key={subnet}>
                    <div style={{ color: '#7e8fa3', fontSize: 12, marginBottom: 4 }}>
                        {subnet}{' '}
                        <span style={{ color: '#445566' }}>({list.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {list.map((a) => (
                            <div
                                key={a.id || a.ip_address}
                                title={`${a.ip_address || a.ip} — ${a.risk_score ?? 0}`}
                                style={{
                                    width: 14,
                                    height: 14,
                                    background: colorFor(a.risk_score ?? 0),
                                    borderRadius: 2,
                                }}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
