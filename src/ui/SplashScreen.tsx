import React from 'react';
import { useBranding } from '../hooks/useBranding';
import { useBootStore } from '../store/useBootStore';
import startLogo from './startlogo.png';

type Props = {
  fadingOut: boolean;
};

export const SplashScreen: React.FC<Props> = ({ fadingOut }) => {
  const branding = useBranding();
  const progress = useBootStore((s) => s.progress);
  const statusText = useBootStore((s) => s.statusText);
  const logoSrc = startLogo || branding.brandAvatarUrl || '/favicon.svg';

  return (
    <div className={`splash-screen${fadingOut ? ' splash-screen--fade' : ''}`}>
      <div className="splash-content">
        <div className="splash-logo">
          <img
            src={logoSrc}
            alt="logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
        <h1 className="splash-title">{branding.name}</h1>
        <p className="splash-subtitle">{branding.subtitle}</p>
        <div className="splash-progress-track" aria-hidden>
          <div className="splash-progress-fill" style={{ width: `${Math.min(100, Math.max(8, progress))}%` }} />
        </div>
        <p className="splash-status">{statusText}</p>
      </div>
    </div>
  );
};
