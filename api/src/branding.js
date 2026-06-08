function normalizeAssetBasePath(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return '/assets/brand';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/assets/brand';
}

export function getBranding() {
  const name = String(process.env.BRAND_NAME || 'YOUR BRAND').trim() || 'YOUR BRAND';
  const subtitle = String(process.env.BRAND_SUBTITLE || 'mini app template').trim() || 'mini app template';
  const assetBasePath = normalizeAssetBasePath(process.env.BRAND_ASSET_BASE_PATH || '/assets/brand');
  const supportLabel = String(process.env.SUPPORT_LABEL || 'Поддержка').trim() || 'Поддержка';
  const appTitle = String(process.env.APP_TITLE || `${name} mini app`).trim() || `${name} mini app`;
  const brandAvatarUrl = String(process.env.BRAND_AVATAR_URL || '').trim();
  const referralShareText =
    String(process.env.REFERRAL_SHARE_TEXT || `Присоединяйся к ${name}:`).trim() ||
    `Присоединяйся к ${name}:`;

  return {
    name,
    subtitle,
    assetBasePath,
    supportLabel,
    appTitle,
    referralShareText,
    brandAvatarUrl,
  };
}

export function buildBrandAssetUrl(relativePath) {
  const { assetBasePath } = getBranding();
  const cleanedPath = String(relativePath || '').replace(/^\/+/, '');
  return cleanedPath ? `${assetBasePath}/${cleanedPath}` : assetBasePath;
}
