import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield } from 'lucide-react';
import GradientButton from './shared/GradientButton';

export default function FinalCTA() {
    return (
        <section className="relative py-24 md:py-32">
            <div className="mx-auto max-w-5xl px-6 md:px-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="relative rounded-3xl border border-cyber-accent/30 overflow-hidden p-10 md:p-16 text-center"
                    style={{
                        background:
                            'radial-gradient(ellipse at top, rgba(0,255,255,0.15), transparent 60%), linear-gradient(180deg, #15303a 0%, #10222b 100%)',
                    }}
                >
                    {/* Glow */}
                    <div className="pointer-events-none absolute -top-1/2 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-30"
                         style={{ background: '#00ffff', filter: 'blur(140px)' }} />

                    <div className="relative">
                        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-cyber-accent/10 ring-1 ring-cyber-accent/40 mb-6">
                            <Shield className="h-6 w-6 text-cyber-accent" />
                        </div>
                        <h2 className="font-display text-white text-3xl md:text-5xl font-bold leading-tight tracking-tight">
                            Ready to see your network's
                            <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyber-accent via-cyber-teal to-cyber-accent">
                                hidden risks?
                            </span>
                        </h2>
                        <p className="mt-5 text-white/65 text-lg max-w-xl mx-auto">
                            Spin up the lab in five minutes. No credit card, no commitments.
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-4">
                            <GradientButton to="/signup" variant="primary" size="lg" icon={ArrowRight}>
                                Start free
                            </GradientButton>
                            <GradientButton to="/login" variant="secondary" size="lg">
                                Sign in
                            </GradientButton>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
