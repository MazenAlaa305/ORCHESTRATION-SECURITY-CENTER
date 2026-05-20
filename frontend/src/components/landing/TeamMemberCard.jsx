import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Linkedin, User2, Pencil, Trash2 } from 'lucide-react';
import { staggerItem } from '../../lib/motion';

function Avatar({ src, name }) {
    const [failed, setFailed] = useState(false);
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join('');

    if (!src || failed) {
        return (
            <div className="h-24 w-24 rounded-full bg-cyber-accent/10 ring-2 ring-cyber-accent/40 flex items-center justify-center">
                {initials ? (
                    <span className="font-display text-cyber-accent text-xl font-bold">{initials}</span>
                ) : (
                    <User2 className="h-9 w-9 text-cyber-accent/70" />
                )}
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-24 w-24 rounded-full object-cover ring-2 ring-cyber-accent/40 shadow-neon-sm"
        />
    );
}

export default function TeamMemberCard({ member, editable = false, onEdit, onDelete }) {
    const { name, role, bio, email, linkedin, photo } = member;

    return (
        <motion.article
            variants={staggerItem}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="group relative flex flex-col items-center text-center rounded-2xl bg-white/[0.03] ring-1 ring-white/10 hover:ring-cyber-accent/40 backdrop-blur-sm p-6 transition-colors"
        >
            {editable && (
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={onEdit}
                        aria-label={`Edit ${name}`}
                        className="h-7 w-7 rounded-md bg-cyber-bg/80 ring-1 ring-white/10 hover:ring-cyber-accent/60 text-white/70 hover:text-cyber-accent flex items-center justify-center"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        aria-label={`Delete ${name}`}
                        className="h-7 w-7 rounded-md bg-cyber-bg/80 ring-1 ring-white/10 hover:ring-cyber-critical/60 text-white/70 hover:text-cyber-critical flex items-center justify-center"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            <Avatar src={photo} name={name} />

            <h3 className="mt-4 font-display text-white text-lg font-semibold leading-tight">
                {name}
            </h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-cyber-accent">
                {role}
            </p>
            {bio && (
                <p className="mt-3 text-sm text-white/65 leading-relaxed line-clamp-3">
                    {bio}
                </p>
            )}

            <div className="mt-5 flex items-center gap-2">
                {email && (
                    <a
                        href={`mailto:${email}`}
                        aria-label={`Email ${name}`}
                        title={email}
                        className="h-9 w-9 rounded-lg bg-white/[0.04] ring-1 ring-white/10 flex items-center justify-center text-white/70 hover:text-cyber-accent hover:ring-cyber-accent/50 transition-colors"
                    >
                        <Mail className="h-4 w-4" />
                    </a>
                )}
                {linkedin && (
                    <a
                        href={linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${name} on LinkedIn`}
                        title="LinkedIn"
                        className="h-9 w-9 rounded-lg bg-white/[0.04] ring-1 ring-white/10 flex items-center justify-center text-white/70 hover:text-cyber-accent hover:ring-cyber-accent/50 transition-colors"
                    >
                        <Linkedin className="h-4 w-4" />
                    </a>
                )}
            </div>
        </motion.article>
    );
}
