import { create } from 'zustand';

type SplashState = {
  isReady: boolean;
  setReady: (ready: boolean) => void;
};

export const useSplashStore = create<SplashState>((set) => ({
  isReady: false,
  setReady: (ready) => set({ isReady: ready }),
}));
