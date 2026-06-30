const normalizeAssetBasePath = (input: string) => {
  const trimmed = String(input || '').trim();
  if (!trimmed) return '/assets/brand';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/assets/brand';
};

const env = import.meta.env;

const brandName =
  String(env.VITE_BRAND_NAME || env.VITE_SHOP_NAME || env.VITE_APP_NAME || '').trim() || 'Mini App Shop';
const brandSubtitle = String(env.VITE_BRAND_SUBTITLE || env.VITE_SHOP_SUBTITLE || '').trim() || 'premium store';
const appTitle = String(env.VITE_APP_TITLE || `${brandName} mini app`).trim() || `${brandName} mini app`;
const supportLabel = String(env.VITE_SUPPORT_LABEL || 'Поддержка').trim() || 'Поддержка';
const referralShareText =
  String(env.VITE_REFERRAL_SHARE_TEXT || `Присоединяйся к ${brandName}:`).trim() ||
  `Присоединяйся к ${brandName}:`;
const assetBasePath = normalizeAssetBasePath(String(env.VITE_BRAND_ASSET_BASE_PATH || env.VITE_SHOP_ASSET_BASE_PATH || '/assets/brand'));
const brandAvatarUrl = String(env.VITE_BRAND_AVATAR_URL || '').trim();

export const buildBrandAssetUrl = (relativePath: string) => {
  const cleanedPath = String(relativePath || '').replace(/^\/+/, '');
  return cleanedPath ? `${assetBasePath}/${cleanedPath}` : assetBasePath;
};

export const branding = {
  name: brandName,
  subtitle: brandSubtitle,
  appTitle,
  supportLabel,
  referralShareText,
  assetBasePath,
  brandAvatarUrl,
};
