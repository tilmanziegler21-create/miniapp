import React from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from './theme';
import { GlassCard } from './GlassCard';
import { PrimaryButton } from './PrimaryButton';
import { formatCurrency } from '../lib/currency';
import { menuTiles, adminTiles, courierTiles } from '../config/menuTiles';
import { useAnalytics } from '../hooks/useAnalytics';

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance?: number;
  cartItemsCount?: number;
  city?: string | null;
  onCityClick?: () => void;
  userStatus?: string | null;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({
  isOpen,
  onClose,
  userBalance = 220,
  cartItemsCount = 0,
  city = null,
  onCityClick,
  userStatus = null,
}) => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  if (!isOpen) return null;

  const handleTileClick = (tile: any) => {
    trackEvent(tile.analyticsEvent, { tileId: tile.id, route: tile.route });
    navigate(tile.route);
    onClose();
  };

  // Update cart badge text dynamically
  const updatedMenuTiles = menuTiles.map(tile => {
    if (tile.id === 'cart') {
      return {
        ...tile,
        badgeText: cartItemsCount > 0 ? String(cartItemsCount) : undefined,
        subtitle: cartItemsCount > 0 ? `${cartItemsCount} товаров` : 'пусто'
      };
    }
    if (tile.id === 'bonuses') {
      return {
        ...tile,
        subtitle: `${formatCurrency(userBalance)} кэшбек`
      };
    }
    return tile;
  });

  const minimalItemStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    padding: `${theme.spacing.md} ${theme.spacing.sm}`,
    borderRadius: theme.radius.md,
    border: '1px solid rgba(96,165,250,0.14)',
    background: 'rgba(16,15,18,0.82)',
    color: theme.colors.dark.text,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.2s ease',
  };

  const renderMinimalItem = (tile: any) => (
    <button
      key={tile.id}
      style={minimalItemStyle}
      onClick={() => handleTileClick(tile)}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: theme.colors.dark.text,
          }}
        >
          {tile.title}
        </div>
        {tile.subtitle ? (
          <div
            style={{
              marginTop: 4,
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.dark.textSecondary,
              letterSpacing: '0.04em',
            }}
          >
            {tile.subtitle}
          </div>
        ) : null}
      </div>
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        {tile.badgeText ? (
          <span
            style={{
              minWidth: 22,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(96,165,250,0.16)',
              color: theme.colors.dark.primary,
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.bold,
              textAlign: 'center',
            }}
          >
            {tile.badgeText}
          </span>
        ) : null}
        <span
          style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.dark.textSecondary,
          }}
        >
          →
        </span>
      </div>
    </button>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: theme.zIndex.drawer,
      display: 'flex',
    }}>
      {/* Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
      background: 'rgba(0,0,0,0.72)',
          zIndex: theme.zIndex.overlay,
        }}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div style={{
        position: 'relative',
        width: '80%',
        maxWidth: '320px',
        height: '100%',
        background: '#0b0f18',
        backdropFilter: `blur(${theme.blur.glass})`,
        zIndex: theme.zIndex.drawer,
        padding: theme.padding.screen,
        overflowY: 'auto',
        animation: 'slideInLeft 0.25s ease-out',
        borderRight: '1px solid rgba(96,165,250,0.12)',
      }}>
        <style>{`
          @keyframes slideInLeft {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.xl,
        }}>
          <h2 style={{
            color: theme.colors.dark.text,
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
          }}>
            Меню
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.dark.text,
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <GlassCard padding="md" variant="elevated" style={{ marginBottom: theme.spacing.lg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                color: theme.colors.dark.textSecondary,
                fontSize: theme.typography.fontSize.xs,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                Город
              </div>
              <div style={{
                color: theme.colors.dark.text,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.bold,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {city || 'не выбран'}
              </div>
            </div>
            <PrimaryButton
              size="sm"
              onClick={() => {
                onCityClick?.();
              }}
            >
              сменить
            </PrimaryButton>
          </div>
        </GlassCard>

        {/* Menu Tiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          {/* Regular menu tiles */}
          {updatedMenuTiles.map(renderMinimalItem)}
          
          {/* Admin tiles */}
          {String(userStatus || '') === 'admin' && adminTiles.map(renderMinimalItem)}
          
          {/* Courier tiles */}
          {(String(userStatus || '') === 'courier' || String(userStatus || '') === 'admin') && courierTiles.map(renderMinimalItem)}
        </div>
      </div>
    </div>
  );
};
