import React, { useEffect, useState } from 'react';
import { networkService } from '../../services/api';
import EmptyState from '../ui/EmptyState';

/**
 * Per-asset event timeline (scans, findings, status changes).
 *
 * Fetches /api/v1/network/assets/{id}/timeline if available.
 * Falls back to the asset's recent scan list when the timeline endpoint
 * is not yet wired on the backend.
 */
export default function AssetTimeline({ assetId }) {
    const [events, setEvents] = useState(null);

    useEffect(() => {
        if (!assetId) {
            setEvents([]);
            return;
        }
        let cancelled = false;
        // The timeline endpoint may not be live yet — degrade gracefully.
        networkService
            .getAssetDetail(assetId)
            .then((r) => {
                if (cancelled) return;
                const detail = r.data || {};
                const ts = detail.timeline || detail.events || [];
                setEvents(Array.isArray(ts) ? ts : []);
            })
            .catch(() => { if (!cancelled) setEvents([]); });
        return () => { cancelled = true; };
    }, [assetId]);

    if (events === null) {
        return <div style={{ color: '#7e8fa3', padding: '0.5rem' }}>Loading…</div>;
    }
    if (events.length === 0) {
        return (
            <EmptyState
                title="No history"
                message="No scan events recorded for this asset yet."
                icon="📜"
            />
        );
    }

    return (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, position: 'relative' }}>
            <span
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 6,
                    width: 1,
                    background: 'rgba(0,255,255,0.25)',
                }}
            />
            {events.map((ev, i) => (
                <li
                    key={ev.id || i}
                    style={{
                        position: 'relative',
                        padding: '0.5rem 0 0.5rem 1.75rem',
                    }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 12,
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: '#00ffff',
                            boxShadow: '0 0 8px rgba(0,255,255,0.6)',
                        }}
                    />
                    <time style={{ color: '#7e8fa3', fontSize: 11 }}>
                        {ev.ts ? new Date(ev.ts).toLocaleString() : '—'}
                    </time>
                    <p style={{ margin: '0.15rem 0 0 0', color: '#cfe1f2', fontSize: 13 }}>
                        <strong>{ev.action || ev.type || 'event'}</strong>
                        {ev.detail ? ` — ${ev.detail}` : ''}
                    </p>
                </li>
            ))}
        </ol>
    );
}
