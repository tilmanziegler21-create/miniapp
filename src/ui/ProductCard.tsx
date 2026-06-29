import React from 'react';
import { theme } from './theme';
import { IconButton } from './IconButton';
import { Heart, Plus, ShoppingCart, Star } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { formatCurrency } from '../lib/currency';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  brand?: string; // Add brand for brand-based images
  isNew?: boolean;
  stock?: number; // Add stock for availability badges
  onAddToCart?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: boolean;
  onClick?: (id: string) => void;
  tasteProfile?: {
    sweetness: number;
    sourness?: number;
    fruitiness?: number;
    coolness?: number;
    strength?: number;
  };
  trustData?: {
    rating: number;
    reviewCount: number;
    weeklyOrders: number;
  };
  showTasteProfile?: boolean;
  showTrustIndicators?: boolean;
}

export const ProductCard = React.memo<ProductCardProps>(({
  id,
  name,
  price,
  image,
  brand = '', // Add brand prop
  isNew = false,
  stock = 0, // Default stock
  onAddToCart,
  onToggleFavorite,
  isFavorite = false,
  onClick,
  tasteProfile,
  trustData,
  showTasteProfile = false,
  showTrustIndicators = false,
}) => {
  const assetUrl = (p: string) => {
    const base = String(import.meta.env.BASE_URL || '/');
    const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
    const path = p.startsWith('/') ? p : `/${p}`;
    return `${prefix}${path}`;
  };

  const normalizeProvidedImage = (v: string) => {
    const raw = String(v || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    if (['-', '—', '–', 'null', 'undefined', '0', 'нет', 'no', 'n/a', 'na'].includes(lower)) return '';
    if (lower.includes('via.placeholder.com')) return '';
    if (lower.startsWith('data:image/')) return raw;
    const base = lower.split('#')[0].split('?')[0];
    const isImageUrl = /\.(png|jpe?g|webp|gif|svg)$/.test(base);
    if (!isImageUrl) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return assetUrl(raw.startsWith('/') ? raw : `/${raw}`);
  };

  const brandKey = (s: string) => {
    const cleaned = String(s || '')
      .toLowerCase()
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9 ]/g, '');
    return { cleaned, compact: cleaned.replace(/\s+/g, '') };
  };

  // Brand-based image logic with gradient fallback
  const getBrandImage = (brand: string, productImage: string) => {
    const normalized = normalizeProvidedImage(productImage);
    if (normalized) return normalized;
    
    // Always return a clean, simple product placeholder instead of brand-specific hardcoded images
    return 'https://via.placeholder.com/300x300/0f172a/60a5fa?text=Product';
  };

  // Brand-based gradient backgrounds as fallback
  const getBrandGradient = (_brand: string) => {
    return 'linear-gradient(135deg, #10203b 0%, #17325f 52%, #0c1a31 100%)';
  };

  const token = brand || name;
  const resolvedImage = getBrandImage(token, image);
  const resolvedGradient = getBrandGradient(token);
  const rating = trustData?.rating ? Math.min(5, Math.max(4, trustData.rating)) : 5;
  const reviewCount = trustData?.reviewCount || 0;
  const tasteBits = tasteProfile
    ? [
        tasteProfile.sweetness ? `сладость ${tasteProfile.sweetness}/5` : '',
        tasteProfile.coolness ? `холод ${tasteProfile.coolness}/5` : '',
      ].filter(Boolean)
    : [];
  const metaText = (
    showTasteProfile && tasteBits.length
      ? tasteBits
      : [brand, stock > 0 ? `${stock} в наличии` : 'Нет в наличии'].filter(Boolean)
  ).join(' · ');
  const fallbackText = showTrustIndicators && reviewCount ? `${reviewCount} оценок` : isNew ? 'Новинка' : 'Быстрое добавление в корзину';

  const styles = {
    root: {
      display: 'flex',
      flexDirection: 'column' as const,
      minHeight: 0,
    },
    imageButton: {
      position: 'relative' as const,
      aspectRatio: '1 / 1',
      overflow: 'hidden',
      borderRadius: theme.radius.lg,
      border: '1px solid rgba(96,165,250,0.14)',
      background: resolvedGradient,
      boxShadow: theme.shadow.card,
      cursor: onClick ? 'pointer' : 'default',
    },
    bgImage: {
      position: 'absolute' as const,
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      pointerEvents: 'none' as const,
    },
    scrim: {
      position: 'absolute' as const,
      inset: 0,
      background: 'linear-gradient(180deg, rgba(4,11,26,0.08) 0%, rgba(4,11,26,0.42) 100%)',
    },
    favoriteButton: {
      position: 'absolute' as const,
      top: theme.spacing.md,
      right: theme.spacing.md,
      zIndex: 2,
    },
    titleButton: {
      marginTop: theme.spacing.md,
      textAlign: 'left' as const,
      background: 'transparent',
      border: 'none',
      padding: 0,
      color: theme.colors.dark.text,
      cursor: onClick ? 'pointer' : 'default',
      minHeight: 'unset',
      minWidth: 'unset',
    },
    title: {
      fontSize: '17px',
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: 1.2,
      color: theme.colors.dark.text,
    },
    metaRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginTop: theme.spacing.sm,
      color: theme.colors.dark.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    subtext: {
      marginTop: 6,
      color: theme.colors.dark.textSecondary,
      fontSize: '13px',
      lineHeight: 1.4,
      minHeight: 18,
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    priceButton: {
      flex: 1,
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      border: '1px solid rgba(96,165,250,0.32)',
      background: 'rgba(96,165,250,0.08)',
      color: theme.colors.dark.primary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      cursor: onClick ? 'pointer' : 'default',
      minHeight: 'unset',
      minWidth: 'unset',
    },
    addButton: {
      width: 48,
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      border: 'none',
      background: theme.gradients.primary,
      color: '#08111f',
      boxShadow: '0 0 22px rgba(96,165,250,0.28)',
      cursor: 'pointer',
      minHeight: 'unset',
      minWidth: 'unset',
    },
  };

  const [added, setAdded] = React.useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (added) return;
    try { WebApp.HapticFeedback.impactOccurred('medium'); } catch (err) { /* ignore */ }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    onAddToCart?.(id);
  };

  return (
    <div style={styles.root}>
      <div
        style={styles.imageButton}
        onClick={() => onClick?.(id)}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {resolvedImage ? <img src={resolvedImage} onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300x300/0f172a/60a5fa?text=Product'; }} alt="" style={styles.bgImage} /> : null}
        <div style={styles.scrim} />
        <div style={styles.favoriteButton}>
          <IconButton
            icon={<Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(id);
            }}
            variant="glass"
            size="sm"
          />
        </div>
      </div>

      <button type="button" onClick={() => onClick?.(id)} style={styles.titleButton}>
        <div style={styles.title}>{name}</div>
      </button>

      <div style={styles.metaRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={13}
            strokeWidth={1.6}
            color={theme.colors.dark.primary}
            fill={i < Math.round(rating) ? theme.colors.dark.primary : 'transparent'}
          />
        ))}
        <span>{reviewCount ? `${rating.toFixed(1)} (${reviewCount})` : 'Топ выбор'}</span>
      </div>

      <div style={styles.subtext}>
        {metaText || fallbackText}
      </div>

      <div style={styles.footer}>
        <button type="button" onClick={() => onClick?.(id)} style={styles.priceButton}>
          {formatCurrency(price)}
        </button>
        <button
          type="button"
          onClick={handleAddToCart}
          style={added ? { ...styles.addButton, background: theme.colors.dark.accentGreen } : styles.addButton}
          className={added ? "" : "sparkle-button"}
          aria-label={`Добавить ${name} в корзину`}
        >
          {added ? <span style={{fontSize: '20px'}}>✓</span> : (stock === 0 ? <ShoppingCart size={20} /> : <Plus className="sparkle-icon" size={22} strokeWidth={2.4} />)}
        </button>
      </div>
    </div>
  );
});
