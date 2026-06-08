import React from 'react';
import { branding as fallbackBranding } from '../config/branding';
import { useConfigStore } from '../store/useConfigStore';

const normalizeAssetBasePath = (input: string) => {
  const trimmed = String(input || '').trim();
  if (!trimmed) return '/assets/brand';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/assets/brand';
};

export const resolveBrandAssetUrl = (relativePath: string, assetBasePath?: string) => {
  const cleanedPath = String(relativePath || '').replace(/^\/+/, '');
  const basePath = normalizeAssetBasePath(assetBasePath || fallbackBranding.assetBasePath);
  return cleanedPath ? `${basePath}/${cleanedPath}` : basePath;
};

export const useBranding = () => {
  const configBranding = useConfigStore((state) => state.config?.branding);

  return React.useMemo(() => {
    const merged = {
      ...fallbackBranding,
      ...configBranding,
    };

    return {
      ...merged,
      name: String(merged.name || fallbackBranding.name).trim() || fallbackBranding.name,
      subtitle: String(merged.subtitle || fallbackBranding.subtitle).trim() || fallbackBranding.subtitle,
      appTitle: String(merged.appTitle || fallbackBranding.appTitle).trim() || fallbackBranding.appTitle,
      supportLabel:
        String(merged.supportLabel || fallbackBranding.supportLabel).trim() || fallbackBranding.supportLabel,
      referralShareText:
        String(merged.referralShareText || fallbackBranding.referralShareText).trim() ||
        fallbackBranding.referralShareText,
      assetBasePath: normalizeAssetBasePath(merged.assetBasePath || fallbackBranding.assetBasePath),
      brandAvatarUrl: String(merged.brandAvatarUrl || fallbackBranding.brandAvatarUrl || '').trim(),
    };
  }, [configBranding]);
};
