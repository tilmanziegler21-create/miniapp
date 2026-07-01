import { create } from 'zustand';

type BootState = {
  isReady: boolean;
  progress: number;
  statusText: string;
  setProgress: (progress: number, statusText: string) => void;
  setReady: (ready: boolean) => void;
  reset: () => void;
};

export const useBootStore = create<BootState>((set) => ({
  isReady: false,
  progress: 0,
  statusText: 'Запуск…',
  setProgress: (progress, statusText) => set({ progress, statusText }),
  setReady: (ready) =>
    set({
      isReady: ready,
      progress: ready ? 100 : 0,
      statusText: ready ? 'Готово' : 'Запуск…',
    }),
  reset: () => set({ isReady: false, progress: 0, statusText: 'Запуск…' }),
}));

/** @deprecated use useBootStore */
export const useSplashStore = useBootStore;
