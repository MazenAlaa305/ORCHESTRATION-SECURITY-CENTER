import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost/api/v1';
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: username, password })
            });

            const data = await response.json();

            if (response.ok) {
                login(data.access_token, username, data.role);
                if (data.force_password_change) {
                    alert('You must change your password on first login. Please update it in your profile settings.');
                }
            } else {
                setError(data.detail || data.message || 'Login failed');
            }
        } catch (err) {
            setError('Network error. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#0a0a0a',
            color: '#00ff00',
            fontFamily: 'Orbitron, sans-serif'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>SECURE LOGIN</h2>

                {error && (
                    <div style={{
                        backgroundColor: 'rgba(255, 0, 0, 0.2)',
                        border: '1px solid red',
                        padding: '10px',
                        marginBottom: '20px',
                        color: '#ff4444'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>USERNAME</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                backgroundColor: '#000',
                                border: '1px solid #00ff00',
                                color: '#00ff00',
                                fontFamily: 'monospace'
                            }}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>PASSWORD</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                backgroundColor: '#000',
                                border: '1px solid #00ff00',
                                color: '#00ff00',
                                fontFamily: 'monospace'
                            }}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
                    </button>
                </form>
                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8rem', opacity: 0.7 }}>
                    AUTHORIZED PERSONNEL ONLY <br />
                    ALL ACTIONS ARE LOGGED
                </div>
            </div>
        </div>
    );
}
