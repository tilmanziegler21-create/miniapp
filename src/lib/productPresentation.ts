export type StableTrustData = {
  rating: number;
  reviewCount: number;
  weeklyOrders: number;
};

export type StableTasteProfile = {
  sweetness: number;
  fruitiness: number;
  coolness: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hashString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const seeded = (seed: number, offset: number) => {
  const next = Math.sin(seed + offset * 999) * 10000;
  return next - Math.floor(next);
};

export const getProductPlaceholderDataUrl = (label: string) => {
  const safeLabel = String(label || 'Product').trim().slice(0, 24) || 'Product';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="55%" stop-color="#17325f" />
          <stop offset="100%" stop-color="#0c1a31" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" rx="32" fill="url(#bg)" />
      <circle cx="308" cy="92" r="70" fill="rgba(96,165,250,0.16)" />
      <circle cx="102" cy="306" r="84" fill="rgba(56,189,248,0.14)" />
      <text x="200" y="188" text-anchor="middle" fill="#e0f2fe" font-family="Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="3">PREMIUM</text>
      <text x="200" y="230" text-anchor="middle" fill="#93c5fd" font-family="Arial, sans-serif" font-size="18" letter-spacing="1.5">${safeLabel}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const getStableTrustData = (seedKey: string): StableTrustData => {
  const seed = hashString(seedKey);
  return {
    rating: Number((4.4 + seeded(seed, 1) * 0.5).toFixed(1)),
    reviewCount: 40 + Math.floor(seeded(seed, 2) * 180),
    weeklyOrders: 12 + Math.floor(seeded(seed, 3) * 90),
  };
};

export const getStableTasteProfile = (seedKey: string): StableTasteProfile => {
  const seed = hashString(seedKey);
  return {
    sweetness: clamp(1 + Math.floor(seeded(seed, 4) * 5), 1, 5),
    fruitiness: clamp(1 + Math.floor(seeded(seed, 5) * 5), 1, 5),
    coolness: clamp(1 + Math.floor(seeded(seed, 6) * 5), 1, 5),
  };
};
