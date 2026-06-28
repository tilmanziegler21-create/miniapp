import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ShoppingCart, Receipt, User } from 'lucide-react';
import { theme } from './theme';
import { useCartStore } from '../store/useCartStore';

export const FooterBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useCartStore();

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
        paddingBottom: `calc(${theme.spacing.sm} + var(--safe-area-bottom, 0px))`,
        display: 'flex',
        justifyContent: 'center',
        background: 'rgba(8, 10, 18, 0.94)',
        backdropFilter: `blur(${theme.blur.glass})`,
        borderTop: '1px solid rgba(96,165,250,0.12)',
        boxShadow: '0 -14px 40px rgba(0,0,0,0.34)',
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
                background: active ? 'rgba(96,165,250,0.12)' : 'transparent',
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
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={20} color={active ? theme.colors.dark.primary : theme.colors.dark.textSecondary} />
                {item.key === 'cart' && (cart?.items?.length || 0) > 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      right: -10,
                      top: -8,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 999,
                      background: theme.gradients.primary,
                      color: '#08111f',
                      fontSize: 10,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      boxShadow: '0 0 18px rgba(96,165,250,0.35)',
                    }}
                  >
                    {cart?.items?.length || 0}
                  </span>
                ) : null}
              </span>
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
