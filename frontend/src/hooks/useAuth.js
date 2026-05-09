// Re-export useAuth from the AuthContext so consumers import from a stable
// `hooks/` location even if the underlying provider is restructured later.
export { useAuth } from '../context/AuthContext';
