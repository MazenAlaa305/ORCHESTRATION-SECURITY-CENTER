import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ui/ProtectedRoute';
import { fadeInUp } from './lib/motion';

// Animated wrapper for each route — fades the page in/out on path change.
const RouteShell = ({ children }) => (
    <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ minHeight: '100vh' }}
    >
        {children}
    </motion.div>
);

const AnimatedRoutes = () => {
    const location = useLocation();
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname.split('/').slice(0, 3).join('/')}>
                <Route
                    path="/login"
                    element={<RouteShell><LoginPage /></RouteShell>}
                />
                <Route
                    path="/signup"
                    element={<RouteShell><SignUpPage /></RouteShell>}
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                            <RouteShell><ProfilePage /></RouteShell>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/:tab?/:subTab?"
                    element={
                        <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                            <RouteShell><Dashboard /></RouteShell>
                        </ProtectedRoute>
                    }
                />
                {/* Catch-all: redirect root and unknown paths to the dashboard */}
                <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
            </Routes>
        </AnimatePresence>
    );
};

function App() {
    return (
        <BrowserRouter>
            <AnimatedRoutes />
        </BrowserRouter>
    );
}

export default App;
