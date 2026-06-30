import { getProductPlaceholderDataUrl } from './productPresentation';

const INVALID_IMAGE_VALUES = new Set(['', '-', '—', '–', 'null', 'undefined', '0', 'нет', 'no', 'n/a', 'na']);

export type NormalizedTasteProfile = {
  sweetness: number;
  sourness: number;
  fruitiness: number;
  coolness: number;
  strength: number;
};

export const assetUrl = (path: string) => {
  const base = String(import.meta.env.BASE_URL || '/');
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${prefix}${normalizedPath}`;
};

export const normalizeProductImage = (value: string) => {
  const raw = String(value || '').trim();
  const lower = raw.toLowerCase();
  if (INVALID_IMAGE_VALUES.has(lower)) return '';
  if (lower.includes('via.placeholder.com')) return '';
  if (lower.startsWith('data:image/')) return raw;

  const cleanPath = raw.split('#')[0].split('?')[0];
  const hasImageExtension = /\.(png|jpe?g|webp|gif|svg)$/i.test(cleanPath);
  if (!hasImageExtension) return '';

  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return assetUrl(raw);
  if (raw.startsWith('images/') || raw.startsWith('assets/')) return assetUrl(`/${raw}`);
  return assetUrl(`/${raw}`);
};

export const resolveProductImage = (label: string, image: string) => {
  const normalized = normalizeProductImage(image);
  return normalized || getProductPlaceholderDataUrl(label || 'Product');
};

export const normalizeTasteProfile = (profile: unknown): NormalizedTasteProfile | undefined => {
  if (!profile || typeof profile !== 'object') return undefined;

  const source = profile as Record<string, unknown>;
  const toNumber = (value: unknown) => {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const normalized = {
    sweetness: toNumber(source.sweetness ?? source.sweet),
    sourness: toNumber(source.sourness ?? source.sour),
    fruitiness: toNumber(source.fruitiness ?? source.fruit),
    coolness: toNumber(source.coolness ?? source.cool ?? source.ice),
    strength: toNumber(source.strength ?? source.hit),
  };

  if (!Object.values(normalized).some(Boolean)) return undefined;
  return normalized;
};

