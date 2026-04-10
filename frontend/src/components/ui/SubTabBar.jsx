import React from 'react';

/**
 * Secondary tab pill bar used inside each main tab section.
 * Renders a compact horizontal row of filter/sub-section buttons.
 */
const SubTabBar = ({ tabs = [], active, onChange }) => (
    <div
        className="flex p-1 rounded-lg w-fit mb-4 gap-0.5"
        style={{
            background: 'rgba(10,17,24,0.7)',
            border: '1px solid rgba(0,255,255,0.06)',
            backdropFilter: 'blur(10px)',
        }}
    >
        {tabs.map(tab => {
            const isActive = active === tab.id;
            return (
                <button
                    key={tab.id}
                    id={`subtab-${tab.id}`}
                    onClick={() => onChange(tab.id)}
                    className={`px-3 py-1.5 text-[10px] font-black transition-all rounded-md flex items-center gap-1.5 uppercase tracking-wider ${
                        isActive
                            ? 'text-gray-900'
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                    style={isActive ? {
                        background: 'linear-gradient(135deg, #00ffff, #0099cc)',
                        boxShadow: '0 0 10px rgba(0,255,255,0.3)',
                    } : {}}
                >
                    {tab.icon && React.cloneElement(tab.icon, { className: 'h-3 w-3' })}
                    {tab.label}
                </button>
            );
        })}
    </div>
);

export default SubTabBar;
