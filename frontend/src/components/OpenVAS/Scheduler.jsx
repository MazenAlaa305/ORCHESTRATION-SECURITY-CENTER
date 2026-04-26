import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import api from '../../services/api';

const FREQUENCY_OPTIONS = [
    { label: 'Every day',    cron: (t) => `${t.m} ${t.h} * * *` },
    { label: 'Every Monday', cron: (t) => `${t.m} ${t.h} * * 1` },
    { label: 'Every Sunday', cron: (t) => `${t.m} ${t.h} * * 0` },
    { label: 'Every hour',   cron: ()  => `0 * * * *` },
    { label: 'Every 6 hours',cron: ()  => `0 */6 * * *` },
];

const Scheduler = () => {
    const [target,    setTarget]    = useState('172.30.0.20');
    const [freqIdx,   setFreqIdx]   = useState(0);
    const [time,      setTime]      = useState('02:00');
    const [loading,   setLoading]   = useState(false);
    const [saved,     setSaved]     = useState(false);
    const [error,     setError]     = useState('');
    const [schedules, setSchedules] = useState([]);
    const [listOpen,  setListOpen]  = useState(false);

    const buildCron = () => {
        const [h, m] = time.split(':').map(Number);
        return FREQUENCY_OPTIONS[freqIdx].cron({ h, m });
    };

    const handleSave = async () => {
        if (!target.trim()) { setError('Enter a target IP or domain.'); return; }
        setError('');
        setLoading(true);
        try {
            await api.post('/scans/schedule', {
                target_url: target.trim(),
                scan_type: 'quick',
                schedule: buildCron(),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            setError(e?.response?.data?.detail || 'Failed to save schedule.');
        } finally {
            setLoading(false);
        }
    };

    const loadSchedules = async () => {
        try {
            const { data } = await api.get('/scans/schedules');
            setSchedules(data.schedules || []);
            setListOpen(true);
        } catch { setSchedules([]); }
    };

    const deleteSchedule = async (id) => {
        try {
            await api.delete(`/scans/schedules/${id}`);
            setSchedules(prev => prev.filter(s => s.id !== id));
        } catch {}
    };

    return (
        <div className="glass-card p-5 flex flex-col gap-4">
            <h3 className="text-gray-400 text-[10px] uppercase tracking-[0.25em] font-black flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" /> Automated Scanning
            </h3>

            {/* Target */}
            <div>
                <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Target</label>
                <input
                    type="text"
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    placeholder="IP, domain, or CIDR"
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-xs font-mono focus:border-cyan-400/50 focus:outline-none"
                />
            </div>

            {/* Frequency */}
            <div>
                <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Frequency</label>
                <select
                    value={freqIdx}
                    onChange={e => setFreqIdx(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-xs focus:border-cyan-400/50 focus:outline-none"
                >
                    {FREQUENCY_OPTIONS.map((o, i) => (
                        <option key={i} value={i}>{o.label}</option>
                    ))}
                </select>
            </div>

            {/* Time (hidden for hourly/6h) */}
            {freqIdx < 3 && (
                <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Time</label>
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded px-3 py-2">
                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                        <input
                            type="time"
                            value={time}
                            onChange={e => setTime(e.target.value)}
                            className="bg-transparent text-white text-xs w-full focus:outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Cron preview */}
            <p className="text-[9px] text-gray-600 font-mono">
                cron: <span className="text-cyan-400/70">{buildCron()}</span>
            </p>

            {error && <p className="text-[9px] text-red-400 font-mono">{error}</p>}

            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 text-xs font-black uppercase tracking-widest hover:bg-cyan-400/20 transition-all disabled:opacity-50"
            >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle className="h-3.5 w-3.5" /> : null}
                {saved ? 'Saved!' : 'Save Schedule'}
            </button>

            <button
                onClick={listOpen ? () => setListOpen(false) : loadSchedules}
                className="text-[9px] text-gray-600 hover:text-gray-400 underline text-center transition-colors"
            >
                {listOpen ? 'Hide schedules' : 'View active schedules'}
            </button>

            {listOpen && (
                <div className="space-y-1.5">
                    {schedules.length === 0 ? (
                        <p className="text-[9px] text-gray-600 text-center">No active schedules.</p>
                    ) : schedules.map(s => (
                        <div key={s.id} className="flex items-center justify-between bg-black/30 border border-white/5 rounded px-3 py-1.5">
                            <div>
                                <p className="text-[10px] text-white font-mono">{s.target_url || s.target_id}</p>
                                <p className="text-[9px] text-cyan-400/60 font-mono">{s.schedule}</p>
                            </div>
                            <button onClick={() => deleteSchedule(s.id)} className="text-red-400/60 hover:text-red-400 transition-colors ml-2">
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-[9px] text-gray-600 italic text-center">
                Scan fires automatically at the configured time.
            </p>
        </div>
    );
};

export default Scheduler;
