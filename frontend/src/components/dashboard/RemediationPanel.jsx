import React from 'react';
import EmptyState from '../ui/EmptyState';

/**
 * Step-by-step remediation guidance for a single vulnerability.
 *
 * Reads the recommendation, structured steps, and reference URLs from the
 * Vulnerability record returned by the API. Renders nothing when no
 * vulnerability is selected.
 */
export default function RemediationPanel({ vulnerability }) {
    if (!vulnerability) {
        return (
            <EmptyState
                title="Select a finding"
                message="Pick a vulnerability from the list to see remediation steps."
                icon="🛠️"
            />
        );
    }

    const steps = Array.isArray(vulnerability.remediation_steps)
        ? vulnerability.remediation_steps
        : [];
    const refs = Array.isArray(vulnerability.references)
        ? vulnerability.references
        : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#cfe1f2' }}>
            <section>
                <div style={labelStyle}>Recommendation</div>
                <p style={{ margin: 0 }}>
                    {vulnerability.recommendation || vulnerability.solution || '—'}
                </p>
            </section>

            <section>
                <div style={labelStyle}>Steps</div>
                {steps.length === 0 ? (
                    <p style={{ margin: 0, color: '#7e8fa3' }}>
                        No automated steps available for this finding.
                    </p>
                ) : (
                    <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                        {steps.map((step, i) => (
                            <li key={i} style={{ marginBottom: '0.25rem' }}>{step}</li>
                        ))}
                    </ol>
                )}
            </section>

            {refs.length > 0 && (
                <section>
                    <div style={labelStyle}>References</div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                        {refs.map((ref) => (
                            <li key={ref}>
                                <a
                                    href={ref}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#00ffff' }}
                                >
                                    {ref}
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {(vulnerability.cvss_score !== undefined || vulnerability.severity) && (
                <section style={{ display: 'flex', gap: '1rem', fontSize: 12, color: '#7e8fa3' }}>
                    {vulnerability.severity && (
                        <span>Severity: <strong style={{ color: '#cfe1f2' }}>{vulnerability.severity}</strong></span>
                    )}
                    {vulnerability.cvss_score !== undefined && vulnerability.cvss_score !== null && (
                        <span>CVSS: <strong style={{ color: '#cfe1f2' }}>
                            {Number(vulnerability.cvss_score).toFixed(1)}
                        </strong></span>
                    )}
                </section>
            )}
        </div>
    );
}

const labelStyle = {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#7e8fa3',
    marginBottom: 4,
};
