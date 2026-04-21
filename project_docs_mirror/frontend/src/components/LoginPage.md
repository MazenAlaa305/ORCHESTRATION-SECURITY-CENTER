# components/LoginPage.jsx — Documentation

## File Purpose

The **authentication login page** (4,466 bytes) presented to users before accessing the dashboard. Provides a styled login form that validates credentials against the AuthContext.

## Key Components

### `LoginPage({ onLogin })`
Renders the full-page login interface.

**Layout:**
- Centered card on a dark background with the Orchestration Security Center logo/branding
- Form fields: Username/Email and Password inputs
- "Sign In" submit button with loading state
- Optional "Remember Me" checkbox

**Logic:**
- Maintains `username`, `password`, `error`, `loading` state.
- On submit: calls `login({ username, password })` from `useAuth()`.
- On success: calls `onLogin()` callback to dismiss the login page.
- On failure: displays the error message below the form inputs.

**Styling:** Uses the cybersecurity dark theme with gradient accents and a subtle matrix-style background animation.

## Dependencies
- `react` — `useState`
- `../context/AuthContext` — `useAuth` hook
