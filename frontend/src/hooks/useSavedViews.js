import { useState, useCallback } from 'react';

const STORAGE_KEY = 'osc.savedViews';
const CHANGE_EVENT = 'osc:views-changed';

const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
};

const persist = (next) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new Event(CHANGE_EVENT));
};

export function useSavedViews() {
    const [views, setViews] = useState(load);

    const save = useCallback((name, payload) => {
        if (!name?.trim()) return;
        setViews(prev => {
            const next = [
                ...prev.filter(v => v.name !== name.trim()),
                { name: name.trim(), payload, savedAt: Date.now() },
            ];
            persist(next);
            return next;
        });
    }, []);

    const remove = useCallback((name) => {
        setViews(prev => {
            const next = prev.filter(v => v.name !== name);
            persist(next);
            return next;
        });
    }, []);

    return { views, save, remove };
}

export { STORAGE_KEY as SAVED_VIEWS_KEY, CHANGE_EVENT as VIEWS_CHANGED_EVENT, load as loadSavedViews };
