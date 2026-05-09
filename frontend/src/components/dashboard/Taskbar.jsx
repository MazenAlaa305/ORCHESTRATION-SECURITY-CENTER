import React, { useState, useEffect } from 'react';
import { Server, Shield, Activity, Wifi, Clock } from 'lucide-react';

const Taskbar = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const utcTime = currentTime.toUTCString().split(' ')[4]; // HH:MM:SS
    const utcDate = currentTime.toUTCString().split(' ').slice(0, 4).join(' ');

    return (
        <div className="fixed bottom-0 left-0 right-0 h-9 bg-black/80 backdrop-blur-md border-t border-white/5 flex items-center px-4 justify-between z-50">
            {/* Left side: system status indicators */}
            <div className="flex items-center gap-5">
                <div className="flex items-center gap-1.5 hover:text-cyber-success cursor-help transition-colors group">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-success opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyber-success" />
                    </span>
                    <span className="text-[10px] font-mono font-bold text-cyber-success uppercase tracking-wider">API LIVE</span>
                </div>

                <div className="flex items-center gap-1.5 text-gray-500 hover:text-cyber-accent cursor-help transition-colors">
                    <Server className="h-2.5 w-2.5" />
                    <span className="text-[10px] font-mono uppercase tracking-wider">Backend: Online</span>
                </div>

                <div className="flex items-center gap-1.5 text-gray-500 hover:text-cyber-accent cursor-help transition-colors">
                    <Shield className="h-2.5 w-2.5 text-cyber-accent" />
                    <span className="text-[10px] font-mono uppercase tracking-wider">System Secure</span>
                </div>

                <div className="flex items-center gap-1.5 text-gray-500 hover:text-cyber-accent cursor-help transition-colors">
                    <Wifi className="h-2.5 w-2.5" />
                    <span className="text-[10px] font-mono uppercase tracking-wider">Network: Connected</span>
                </div>
            </div>

            {/* Right side: monitoring status + time */}
            <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-1.5 text-gray-500">
                    <Activity className="h-2.5 w-2.5 animate-pulse text-cyber-accent" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyber-accent/70">Monitoring Active</span>
                </div>

                <div className="flex items-center gap-2 border-l border-white/5 pl-4">
                    <Clock className="h-2.5 w-2.5 text-gray-600" />
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[11px] font-mono font-bold text-white tabular-nums">{utcTime}</span>
                        <span className="text-[8px] font-mono text-gray-600 tabular-nums">{utcDate} UTC</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Taskbar;
