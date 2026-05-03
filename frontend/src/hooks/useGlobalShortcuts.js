import { useEffect, useRef } from 'react';

/**
 * Global keyboard shortcuts that aren't owned by a single component.
 *
 * Mounted once at the top of the app (Layout). All other shortcuts
 * (⌘K, ?, Esc, J/K-in-drawer) are owned by the components they target.
 *
 * Implemented here:
 *   Q              → open Quick Scan popover
 *   G then C       → navigate to Command Center
 *   G then O       → Operations
 *   G then T       → Threat Center
 *   G then A       → AI Brain
 *   G then R       → Reports
 *   G then S       → Settings
 *
 * Keystrokes are ignored when the user is typing in an input,
 * textarea, or any contenteditable element, and when a modifier
 * key (Ctrl/Cmd/Alt) is held down.
 */
export default function useGlobalShortcuts() {
    // Tracks the "G then …" leader sequence. 1.2 s window before reset.
    const leaderRef = useRef({ active: false, timer: null });

    useEffect(() => {
        const navTo = (tab, sub) =>
            window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: { tab, sub } }));

        const NAV_MAP = {
            c: ['overview'],
            o: ['operations'],
            t: ['threat-center'],
            a: ['ai-brain'],
            r: ['reports'],
            s: ['settings'],
        };

        const clearLeader = () => {
            leaderRef.current.active = false;
            if (leaderRef.current.timer) {
                clearTimeout(leaderRef.current.timer);
                leaderRef.current.timer = null;
            }
        };

        const handler = (e) => {
            // Ignore typing in form fields
            const t = e.target;
            const tag = t?.tagName;
            const isTyping =
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                tag === 'SELECT' ||
                t?.isContentEditable;
            if (isTyping) return;

            // Modifier-held keystrokes belong to other handlers (⌘K etc.)
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            const k = (e.key || '').toLowerCase();

            // Step 2 of "G then X" — consume the second key as a destination
            if (leaderRef.current.active && NAV_MAP[k]) {
                e.preventDefault();
                clearLeader();
                const [tab, sub] = NAV_MAP[k];
                navTo(tab, sub);
                return;
            }

            // Step 1 of "G then X" — arm the leader
            if (k === 'g') {
                e.preventDefault();
                leaderRef.current.active = true;
                if (leaderRef.current.timer) clearTimeout(leaderRef.current.timer);
                leaderRef.current.timer = setTimeout(clearLeader, 1200);
                return;
            }

            // Q — Quick scan popover
            if (k === 'q') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('dashboard:open-quick-scan'));
                return;
            }

            // Any other unmodified key cancels the leader so it doesn't strand
            if (leaderRef.current.active) clearLeader();
        };

        window.addEventListener('keydown', handler);
        return () => {
            window.removeEventListener('keydown', handler);
            clearLeader();
        };
    }, []);
}
