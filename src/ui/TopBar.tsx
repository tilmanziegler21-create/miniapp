import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Settings } from 'lucide-react';
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
        background: 'rgba(9, 17, 30, 0.82)',
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
          icon={<Menu size={20} />}
          onClick={onMenuClick}
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
          <IconButton
            icon={<Settings size={20} />}
            onClick={onSettingsClick}
            variant="glass"
            size="md"
          />
        ) : null}
      </div>
    </div>
  );
};
