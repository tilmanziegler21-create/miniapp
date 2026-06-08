const normalizeAssetBasePath = (input: string) => {
  const trimmed = String(input || '').trim();
  if (!trimmed) return '/assets/brand';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/assets/brand';
};

const env = import.meta.env;

const brandName = String(env.VITE_BRAND_NAME || 'YOUR BRAND').trim() || 'YOUR BRAND';
const brandSubtitle = String(env.VITE_BRAND_SUBTITLE || 'mini app template').trim() || 'mini app template';
const appTitle = String(env.VITE_APP_TITLE || `${brandName} mini app`).trim() || `${brandName} mini app`;
const supportLabel = String(env.VITE_SUPPORT_LABEL || 'Поддержка').trim() || 'Поддержка';
const referralShareText =
  String(env.VITE_REFERRAL_SHARE_TEXT || `Присоединяйся к ${brandName}:`).trim() ||
  `Присоединяйся к ${brandName}:`;
const assetBasePath = normalizeAssetBasePath(String(env.VITE_BRAND_ASSET_BASE_PATH || '/assets/brand'));
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
