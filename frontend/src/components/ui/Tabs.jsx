import React from 'react';
import { motion } from 'framer-motion';

const Tabs = ({ tabs, activeTab, onChange }) => {
    return (
        <div className="flex border-b border-gray-700 mb-6 relative">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <motion.button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className={`relative px-6 py-3 text-sm font-medium transition-colors ${
                            isActive ? 'text-cyber-accent' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {tab.icon}
                            {tab.label}
                        </div>
                        {isActive && (
                            <motion.div
                                layoutId="tabs-indicator"
                                className="absolute left-0 right-0 -bottom-px h-0.5 bg-cyber-accent"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
};

export default Tabs;
