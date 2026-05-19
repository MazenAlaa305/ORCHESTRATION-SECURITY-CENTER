import React from 'react';

export default function SectionContainer({ id, children, className = '', innerClassName = '' }) {
    return (
        <section id={id} className={`relative w-full py-20 md:py-28 ${className}`}>
            <div className={`mx-auto max-w-7xl px-6 md:px-10 ${innerClassName}`}>
                {children}
            </div>
        </section>
    );
}
