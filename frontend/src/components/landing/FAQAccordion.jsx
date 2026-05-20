import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import SectionContainer from './shared/SectionContainer';

const FAQS = [
    {
        q: 'Do I need a dedicated security analyst to use OSC?',
        a: 'No. The platform was designed for SME IT admins. Findings are translated into plain-language action items and the AI advisor explains every alert in business terms.',
    },
    {
        q: 'Which scanners does the platform integrate with?',
        a: 'Out of the box: Nmap for reconnaissance, Nuclei for templated vulnerability checks, OpenVAS for deep CVE scans, and Wazuh as the SIEM backbone.',
    },
    {
        q: 'Is the AI advisor able to make changes to my network?',
        a: 'No. The AI is strictly read-only. It analyzes findings and suggests remediation, but never executes any change against your environment.',
    },
    {
        q: 'Can I self-host the platform?',
        a: 'Yes. The entire stack ships as Docker Compose. You can run it on your own infrastructure or inside an isolated lab environment.',
    },
    {
        q: 'How does role-based access work?',
        a: 'There are three default roles — admin, analyst, and viewer — each with granular permissions for scans, findings, and configuration. Roles can be customized per deployment.',
    },
    {
        q: 'Is OSC open source?',
        a: 'The platform is built on a 100% open-source core (Nmap, Nuclei, OpenVAS, Wazuh, FastAPI, React). The orchestration layer is released under a permissive license — see the docs for details.',
    },
];

function Item({ q, a, defaultOpen }) {
    const [open, setOpen] = useState(!!defaultOpen);
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] overflow-hidden">
            <button
                type="button"
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
            >
                <span className="text-white font-medium">{q}</span>
                <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 text-cyber-accent"
                >
                    <Plus className="h-5 w-5" />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 text-white/65 text-sm leading-relaxed">{a}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function FAQAccordion() {
    return (
        <SectionContainer id="faq">
            <div className="text-center max-w-2xl mx-auto mb-12">
                <p className="text-xs uppercase tracking-[0.2em] text-cyber-accent/80 mb-3">Questions</p>
                <h2 className="font-display text-white text-3xl md:text-4xl font-bold leading-tight">
                    Frequently asked questions
                </h2>
            </div>

            <div className="mx-auto max-w-3xl space-y-3">
                {FAQS.map((f, i) => (
                    <Item key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />
                ))}
            </div>
        </SectionContainer>
    );
}
