import React from 'react';
import Dashboard from './pages/Dashboard';
import LoginPage from './components/LoginPage';
import { useAuth } from './context/AuthContext';

function App() {
    const { token } = useAuth();

    if (!token) {
        return <LoginPage />;
    }

    return <Dashboard />;
}

export default App;
