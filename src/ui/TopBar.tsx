import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, Settings, ShoppingCart } from 'lucide-react';
import { theme } from './theme';
import { IconButton } from './IconButton';
import { useBranding } from '../hooks/useBranding';

interface TopBarProps {
  onMenuClick: () => void;
  onCartClick?: () => void;
  userName?: string;
  bonusMultiplier?: number;
  avatarUrl?: string;
  cartCount?: number;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showSettings?: boolean;
  onSettingsClick?: () => void;
  onBonusClick?: () => void;
  onProfileClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuClick,
  onCartClick,
  cartCount = 0,
  showBackButton = false,
  onBackClick,
  showSettings = false,
  onSettingsClick,
}) => {
  const navigate = useNavigate();
  const branding = useBranding();

  const handleLogoClick = () => {
    navigate('/home');
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: theme.zIndex.header,
        height: '64px',
        padding: `0 ${theme.padding.screen}`,
        background: 'rgba(8, 10, 18, 0.92)',
        backdropFilter: `blur(${theme.blur.glass})`,
        borderBottom: theme.border.glass,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: theme.padding.screen,
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <IconButton
          icon={showBackButton ? <ArrowLeft size={20} /> : <Menu size={20} />}
          onClick={showBackButton ? (onBackClick || (() => navigate(-1))) : onMenuClick}
          variant="glass"
          size="md"
        />
      </div>

      <div
        style={{
          textAlign: 'center',
          lineHeight: 1.05,
          cursor: 'pointer',
        }}
        onClick={handleLogoClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLogoClick();
          }
        }}
      >
        <div
          style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            letterSpacing: '0.02em',
            textAlign: 'center',
          }}
        >
          {branding.name}
        </div>
        <div
          style={{
            fontSize: theme.typography.fontSize.xs,
            opacity: 0.7,
            marginTop: 2,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {branding.subtitle}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: theme.padding.screen,
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        {showSettings ? (
          <IconButton icon={<Settings size={20} />} onClick={onSettingsClick} variant="glass" size="md" />
        ) : onCartClick ? (
          <div style={{ position: 'relative' }}>
            <IconButton icon={<ShoppingCart size={20} />} onClick={onCartClick} variant="glass" size="md" />
            {cartCount > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  right: -5,
                  top: -4,
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 999,
                  background: theme.gradients.primary,
                  color: '#08111f',
                  fontSize: 10,
                  fontWeight: theme.typography.fontWeight.bold,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 18px rgba(96,165,250,0.35)',
                }}
              >
                {cartCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
