# frontend/src/context/AuthContext.jsx — Documentation

## File Purpose

Provides a **React Context for authentication state** management, making the current user's authentication status and user data available throughout the component tree without prop drilling. In the current implementation, authentication is lightweight — tracking whether a user is "logged in" within the session.

## Key Components

### `AuthContext`
Created via `React.createContext()`. Holds the authentication state object.

### `AuthProvider({ children })`
A React context provider component that wraps the application and manages authentication state.

**State:**
- `user` — The current user object (`null` if not authenticated). Contains basic user information once logged in.
- `isAuthenticated` — Boolean derived from whether `user` is non-null.

**Functions exposed via context value:**
- `login(credentials)` — Validates credentials (against a mock or real backend endpoint) and sets the `user` state. Saves the session token to `localStorage` for persistence across page refreshes.
- `logout()` — Clears the `user` state and removes the session token from `localStorage`.

**Effect (session persistence):**
On mount, checks `localStorage` for an existing session token. If found, restores the `user` state, bypassing the need to log in again.

### `useAuth()`
Custom hook that calls `useContext(AuthContext)` and returns the context value. Components use `const { user, login, logout, isAuthenticated } = useAuth()` for clean access.

## Interaction with Login Flow
The `LoginPage` component calls `login(credentials)` from this context. Once `isAuthenticated` becomes `true`, the `Layout` or `App` component conditionally renders the main dashboard instead of the login page.

## Dependencies

### External
- `react` — `createContext`, `useContext`, `useState`, `useEffect`
