import React from 'react';
import Taskbar from '../components/dashboard/Taskbar';
import Sidebar from './Sidebar';

const Layout = ({ children, activeTab, onTabChange }) => {
    return (
        <div className="min-h-screen bg-cyber-dark text-gray-100 font-sans selection:bg-cyber-accent selection:text-gray-900 transition-colors duration-500 flex flex-row overflow-hidden">
            {/* Background Glow Effects */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                {/* Orbs */}
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-vibrant/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-accent/10 blur-[120px] rounded-full" />
                <div className="absolute top-[40%] left-[35%] w-[30%] h-[30%] bg-cyber-neon/4 blur-[100px] rounded-full" />
                {/* SOC Grid Pattern */}
                <div className="absolute inset-0 grid-bg opacity-60" />
            </div>

            <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen relative z-10 w-full">
                <main className="flex-1 px-8 py-6 pb-12 overflow-y-auto custom-scrollbar w-full">
                    {children}
                </main>
                <Taskbar />
            </div>
        </div>
    );
};

export default Layout;
