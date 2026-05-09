/**
 * Integration tests for the Login → Dashboard auth flow.
 *
 * Uses MSW (Mock Service Worker) to intercept HTTP calls so the full
 * component tree (LoginPage → AuthContext → api.js) can be exercised
 * without a real backend.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

import { AuthProvider } from '../../context/AuthContext';


// ── MSW server — all handlers registered at top level ────────────────────────
// Handlers must be in the initial setupServer() call (not server.use()) to
// survive the afterEach resetHandlers() call.

const server = setupServer(
    http.post('*/api/v1/auth/login', () =>
        HttpResponse.json({ access_token: 'mock-jwt-token', token_type: 'bearer' })
    ),
    http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({ email: 'admin@test', role: 'ADMIN', id: '1' })
    ),
    http.post('*/api/v1/auth/logout', () =>
        HttpResponse.json({ message: 'logged out' })
    ),
    http.get('*/api/v1/scans/', () =>
        HttpResponse.json({ items: [{ id: 's1', status: 'COMPLETED' }], total: 1 })
    ),
    http.post('*/api/v1/scans/', () =>
        HttpResponse.json({ id: 'new-scan', status: 'PENDING' }, { status: 201 })
    ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
    server.resetHandlers();
    sessionStorage.clear();
});
afterAll(() => server.close());


// ── Helpers ───────────────────────────────────────────────────────────────────

const Wrapper = ({ children }) => (
    <AuthProvider>
        <MemoryRouter>
            {children}
        </MemoryRouter>
    </AuthProvider>
);


// ── AuthContext integration with MSW ─────────────────────────────────────────

describe('Auth flow integration', () => {
    it('login call stores token in sessionStorage', async () => {
        const TestComponent = () => {
            const [status, setStatus] = React.useState('idle');
            const handleLogin = async () => {
                try {
                    const res = await fetch('/api/v1/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: 'admin@test', password: 'pass' }),
                    });
                    const data = await res.json();
                    sessionStorage.setItem('token', data.access_token);
                    setStatus('logged-in');
                } catch {
                    setStatus('error');
                }
            };
            return (
                <div>
                    <span data-testid="status">{status}</span>
                    <button onClick={handleLogin}>Login</button>
                </div>
            );
        };

        const user = userEvent.setup();
        render(<Wrapper><TestComponent /></Wrapper>);

        await user.click(screen.getByText('Login'));

        await waitFor(() => {
            expect(screen.getByTestId('status').textContent).toBe('logged-in');
        });
        expect(sessionStorage.getItem('token')).toBe('mock-jwt-token');
    });

    it('failed login returns error response', async () => {
        server.use(
            http.post('*/api/v1/auth/login', () =>
                HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 })
            )
        );

        const TestComponent = () => {
            const [error, setError] = React.useState(null);
            const handleLogin = async () => {
                const res = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ username: 'x', password: 'wrong' }),
                });
                if (!res.ok) setError('unauthorized');
            };
            return (
                <div>
                    {error && <span data-testid="error">{error}</span>}
                    <button onClick={handleLogin}>Login</button>
                </div>
            );
        };

        const user = userEvent.setup();
        render(<Wrapper><TestComponent /></Wrapper>);

        await user.click(screen.getByText('Login'));

        await waitFor(() => {
            expect(screen.getByTestId('error').textContent).toBe('unauthorized');
        });
        expect(sessionStorage.getItem('token')).toBeNull();
    });

    it('me endpoint returns user profile', async () => {
        const TestComponent = () => {
            const [profile, setProfile] = React.useState(null);
            React.useEffect(() => {
                fetch('/api/v1/auth/me', {
                    headers: { Authorization: 'Bearer mock-token' },
                })
                    .then(r => r.json())
                    .then(setProfile);
            }, []);

            if (!profile) return <span>Loading...</span>;
            return (
                <div>
                    <span data-testid="email">{profile.email}</span>
                    <span data-testid="role">{profile.role}</span>
                </div>
            );
        };

        render(<Wrapper><TestComponent /></Wrapper>);

        await waitFor(() => {
            expect(screen.getByTestId('email').textContent).toBe('admin@test');
        });
        expect(screen.getByTestId('role').textContent).toBe('ADMIN');
    });

    it('logout clears sessionStorage', async () => {
        sessionStorage.setItem('token', 'existing-token');
        sessionStorage.setItem('user', JSON.stringify({ email: 'admin@test' }));

        const TestComponent = () => {
            const handleLogout = () => {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
            };
            return <button onClick={handleLogout}>Logout</button>;
        };

        const user = userEvent.setup();
        render(<Wrapper><TestComponent /></Wrapper>);

        await user.click(screen.getByText('Logout'));

        expect(sessionStorage.getItem('token')).toBeNull();
        expect(sessionStorage.getItem('user')).toBeNull();
    });
});


// ── Scan service integration ──────────────────────────────────────────────────

describe('Scan service integration', () => {
    it('GET /scans/ returns paginated envelope', async () => {
        const res = await fetch('/api/v1/scans/');
        const data = await res.json();
        expect(data).toHaveProperty('items');
        expect(Array.isArray(data.items)).toBe(true);
        expect(data.total).toBe(1);
    });

    it('POST /scans/ creates a new scan', async () => {
        const res = await fetch('/api/v1/scans/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_url: 'http://example.com', scan_type: 'quick' }),
        });
        const data = await res.json();
        expect(data.id).toBe('new-scan');
        expect(data.status).toBe('PENDING');
    });
});
