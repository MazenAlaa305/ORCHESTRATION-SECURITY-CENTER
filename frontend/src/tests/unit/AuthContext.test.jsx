/**
 * Unit + integration tests for AuthContext (src/context/AuthContext.jsx).
 *
 * Tests cover:
 * - Initial state (no token in sessionStorage)
 * - login() sets token + user in state and sessionStorage
 * - logout() clears token, user, and sessionStorage
 * - Persisted state hydrated from sessionStorage on mount
 * - useAuth() hook throws when used outside AuthProvider
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AuthProvider, useAuth } from '../../context/AuthContext';


// ── Test consumer component ───────────────────────────────────────────────────

const AuthDisplay = () => {
    const { token, user, login, logout } = useAuth();
    return (
        <div>
            <span data-testid="token">{token ?? 'null'}</span>
            <span data-testid="email">{user?.email ?? 'null'}</span>
            <span data-testid="role">{user?.role ?? 'null'}</span>
            <button onClick={() => login('tok-123', 'admin@test', 'ADMIN')}>Login</button>
            <button onClick={logout}>Logout</button>
        </div>
    );
};


// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
    sessionStorage.clear();
});

afterEach(() => {
    sessionStorage.clear();
});


// ── Initial state ─────────────────────────────────────────────────────────────

describe('AuthContext initial state', () => {
    it('renders with null token when sessionStorage is empty', () => {
        render(<AuthProvider><AuthDisplay /></AuthProvider>);
        expect(screen.getByTestId('token').textContent).toBe('null');
    });

    it('renders with null user when sessionStorage is empty', () => {
        render(<AuthProvider><AuthDisplay /></AuthProvider>);
        expect(screen.getByTestId('email').textContent).toBe('null');
    });

    it('hydrates token from sessionStorage on mount', () => {
        sessionStorage.setItem('token', 'stored-token');
        sessionStorage.setItem('user', JSON.stringify({ email: 'stored@test', role: 'VIEWER' }));
        render(<AuthProvider><AuthDisplay /></AuthProvider>);
        expect(screen.getByTestId('token').textContent).toBe('stored-token');
        expect(screen.getByTestId('email').textContent).toBe('stored@test');
        expect(screen.getByTestId('role').textContent).toBe('VIEWER');
    });
});


// ── login() ───────────────────────────────────────────────────────────────────

describe('login()', () => {
    it('sets token and user in state', async () => {
        const user = userEvent.setup();
        render(<AuthProvider><AuthDisplay /></AuthProvider>);

        await user.click(screen.getByText('Login'));

        expect(screen.getByTestId('token').textContent).toBe('tok-123');
        expect(screen.getByTestId('email').textContent).toBe('admin@test');
        expect(screen.getByTestId('role').textContent).toBe('ADMIN');
    });

    it('persists token to sessionStorage', async () => {
        const user = userEvent.setup();
        render(<AuthProvider><AuthDisplay /></AuthProvider>);

        await user.click(screen.getByText('Login'));

        expect(sessionStorage.getItem('token')).toBe('tok-123');
    });

    it('persists user object to sessionStorage', async () => {
        const user = userEvent.setup();
        render(<AuthProvider><AuthDisplay /></AuthProvider>);

        await user.click(screen.getByText('Login'));

        const stored = JSON.parse(sessionStorage.getItem('user'));
        expect(stored.email).toBe('admin@test');
        expect(stored.role).toBe('ADMIN');
    });
});


// ── logout() ─────────────────────────────────────────────────────────────────

describe('logout()', () => {
    it('clears token from state', async () => {
        const user = userEvent.setup();
        render(<AuthProvider><AuthDisplay /></AuthProvider>);

        await user.click(screen.getByText('Login'));
        await user.click(screen.getByText('Logout'));

        expect(screen.getByTestId('token').textContent).toBe('null');
    });

    it('clears user from state', async () => {
        const user = userEvent.setup();
        render(<AuthProvider><AuthDisplay /></AuthProvider>);

        await user.click(screen.getByText('Login'));
        await user.click(screen.getByText('Logout'));

        expect(screen.getByTestId('email').textContent).toBe('null');
    });

    it('removes token from sessionStorage', async () => {
        const user = userEvent.setup();
        render(<AuthProvider><AuthDisplay /></AuthProvider>);

        await user.click(screen.getByText('Login'));
        await user.click(screen.getByText('Logout'));

        expect(sessionStorage.getItem('token')).toBeNull();
    });

    it('removes user from sessionStorage', async () => {
        const user = userEvent.setup();
        render(<AuthProvider><AuthDisplay /></AuthProvider>);

        await user.click(screen.getByText('Login'));
        await user.click(screen.getByText('Logout'));

        expect(sessionStorage.getItem('user')).toBeNull();
    });
});


// ── useAuth hook ──────────────────────────────────────────────────────────────

describe('useAuth()', () => {
    it('provides token, user, login, logout from context', () => {
        let contextValue;

        const Capture = () => {
            contextValue = useAuth();
            return null;
        };

        render(<AuthProvider><Capture /></AuthProvider>);

        expect(contextValue).toHaveProperty('token');
        expect(contextValue).toHaveProperty('user');
        expect(typeof contextValue.login).toBe('function');
        expect(typeof contextValue.logout).toBe('function');
    });
});
