import { create } from 'zustand';

export const useEnvStore = create((set) => ({
    activeEnv: 'all', // 'all' | 'lab' | 'production'
    setActiveEnv: (env) => set({ activeEnv: env }),
}));
