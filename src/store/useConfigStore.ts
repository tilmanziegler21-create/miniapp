import { create } from 'zustand';
import { configAPI } from '../services/api';

export type AppConfig = {
  botUsername?: string;
  branding?: {
    name: string;
    subtitle: string;
    assetBasePath: string;
    supportLabel: string;
    appTitle: string;
    referralShareText: string;
    brandAvatarUrl?: string;
  };
  liquidPrices?: Record<string, number>;
  cities: Array<{ code: string; title: string; currencySymbol?: string; managerChatUrl?: string }>;
  cityCodes?: string[];
  currency: string;
  currencySymbol?: string;
  groupUrl: string;
  reservationTtlMs: number;
  support: {
    managerUsername: string;
    supportUrl?: string;
    faqBlocks?: Array<{ title: string; text: string }>;
  };
  banners?: Array<{ title?: string; subtitle?: string; gradient?: string; imageUrl: string; linkType?: string; linkTarget?: string }>;
  categoryTiles?: Array<{ slug: string; title: string; imageUrl: string; badgeText?: string }>;
  pickupPoints?: Array<{ id: string; title: string; address: string }>;
  referralRules?: { title: string; description: string; ctaText?: string };
  promos?: Array<{ id: string; title: string; description: string; type: string; value: number; minTotal?: number; startsAt?: string; endsAt?: string }>;
  contests?: Array<{ id: string; title: string; description: string; ctaText?: string; route?: string }>;
};

type ConfigState = {
  config: AppConfig | null;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<AppConfig | null>;
};

export const useConfigStore = create<ConfigState>((set, get) => {
  let loadPromise: Promise<AppConfig | null> | null = null;

  return {
    config: null,
    isLoading: false,
    error: null,
    load: () => {
      if (get().config) return Promise.resolve(get().config);
      if (loadPromise) return loadPromise;

      set({ isLoading: true, error: null });
      loadPromise = configAPI.get()
        .then((resp) => {
          set({ config: resp.data, isLoading: false, error: null });
          loadPromise = null;
          return resp.data;
        })
        .catch((e) => {
          console.error('Failed to load config:', e);
          set({ isLoading: false, error: 'CONFIG_LOAD_FAILED' });
          loadPromise = null;
          return null;
        });

      return loadPromise;
    },
  };
});
