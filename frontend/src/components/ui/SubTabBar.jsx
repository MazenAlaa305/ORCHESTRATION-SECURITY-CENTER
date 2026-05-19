import React from 'react';
import { motion } from 'framer-motion';

/**
 * Secondary tab pill bar used inside each main tab section.
 * Renders a compact horizontal row of filter/sub-section buttons.
 */
const SubTabBar = ({ tabs = [], active, onChange, layoutGroup = 'subtab' }) => (
    <div
        className="flex p-1 rounded-lg w-fit mb-4 gap-0.5 relative"
        style={{
            background: 'rgba(10,17,24,0.7)',
            border: '1px solid rgba(0,255,255,0.06)',
            backdropFilter: 'blur(10px)',
        }}
    >
        {tabs.map(tab => {
            const isActive = active === tab.id;
            return (
                <motion.button
                    key={tab.id}
                    id={`subtab-${tab.id}`}
                    onClick={() => onChange(tab.id)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`relative px-3 py-1.5 text-[10px] font-black transition-colors rounded-md flex items-center gap-1.5 uppercase tracking-wider ${
                        isActive ? 'text-gray-900' : 'text-gray-500 hover:text-white'
                    }`}
                >
                    {isActive && (
                        <motion.span
                            layoutId={`subtab-pill-${layoutGroup}`}
                            className="absolute inset-0 rounded-md"
                            style={{
                                background: 'linear-gradient(135deg, #00ffff, #0099cc)',
                                boxShadow: '0 0 10px rgba(0,255,255,0.3)',
                            }}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                        {tab.icon && React.cloneElement(tab.icon, { className: 'h-3 w-3' })}
                        {tab.label}
                    </span>
                </motion.button>
            );
        })}
    </div>
);

export default SubTabBar;
