import React from 'react';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ui/ProtectedRoute';

function App() {
    return (
        <ProtectedRoute fallback={<LoginPage />}>
            <Dashboard />
        </ProtectedRoute>
    );
}

export default App;
