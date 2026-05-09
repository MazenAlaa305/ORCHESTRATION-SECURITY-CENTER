import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ui/ProtectedRoute';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/dashboard/:tab?/:subTab?"
                    element={
                        <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                {/* Catch-all: redirect root and unknown paths to the dashboard */}
                <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
