import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ShoppingCart, Receipt, User } from 'lucide-react';
import { theme } from './theme';

export const FooterBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { key: 'home', label: 'Меню', icon: Home, route: '/home', match: ['/', '/home'] },
    { key: 'cart', label: 'Корзина', icon: ShoppingCart, route: '/cart', match: ['/cart', '/checkout'] },
    { key: 'orders', label: 'Заказы', icon: Receipt, route: '/orders', match: ['/orders', '/order'] },
    { key: 'profile', label: 'Профиль', icon: User, route: '/profile', match: ['/profile'] },
  ];

  const isActive = (matchers: string[]) =>
    matchers.some((matcher) =>
      matcher === '/' ? location.pathname === '/' || location.pathname === '/home' : location.pathname.startsWith(matcher),
    );

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.header,
        padding: `${theme.spacing.sm} ${theme.padding.screen}`,
        paddingBottom: `calc(${theme.spacing.md} + var(--safe-area-bottom, 0px))`,
        display: 'flex',
        justifyContent: 'center',
        background: 'rgba(15, 17, 21, 0.88)',
        backdropFilter: `blur(${theme.blur.glass})`,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.28)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: theme.spacing.xs,
          alignItems: 'end',
        }}
      >
        {items.map((item) => {
          const active = isActive(item.match);
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.route)}
              style={{
                border: 'none',
                background: active ? 'rgba(148,163,184,0.16)' : 'transparent',
                color: active ? theme.colors.dark.text : theme.colors.dark.textSecondary,
                borderRadius: theme.radius.md,
                padding: `${theme.spacing.sm} ${theme.spacing.xs}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={20} color={active ? theme.colors.dark.primary : theme.colors.dark.textSecondary} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: active ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.medium,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
