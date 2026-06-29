import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { DrawerMenu } from './DrawerMenu';
import { FooterBar } from './FooterBar';
import { ToastHost } from './ToastHost';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useConfigStore } from '../store/useConfigStore';
import { useCityStore } from '../store/useCityStore';
import { CityPickerModal } from './CityPickerModal';
import { useToastStore } from '../store/useToastStore';
import { cartAPI, referralAPI } from '../services/api';
import { useBranding } from '../hooks/useBranding';
import { useSplashStore } from '../store/useSplashStore';
import { CART_FLY_EVENT, type CartFlyDetail } from '../lib/cartFeedback';

type Props = {
  children: React.ReactNode;
  showMenu?: boolean;
};

export const AppShell: React.FC<Props> = ({ children, showMenu = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastStore();
  const { cart, setCart, syncCart } = useCartStore();
  const { user } = useAuthStore();
  const branding = useBranding();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { config, load } = useConfigStore();
  const { city, setCity, ensureCity } = useCityStore();
  const { setReady } = useSplashStore();
  const [cityModalOpen, setCityModalOpen] = React.useState(false);
  const [cartPulseKey, setCartPulseKey] = React.useState(0);
  const [flyItems, setFlyItems] = React.useState<
    Array<{
      id: string;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      image?: string;
      active: boolean;
    }>
  >([]);

  // Determine if we should show back button
  const showBackButton = location.pathname !== '/home' && location.pathname !== '/';

  React.useEffect(() => {
    document.title = branding.appTitle;
  }, [branding.appTitle]);

  React.useEffect(() => {
    (async () => {
      const cfg = await load();
      const cities = cfg?.cities || [];
      const codes = cities.map((c) => String(c.code || '')).filter(Boolean);
      if (!codes.length) {
        toast.push('Города не настроены', 'error');
        setReady(true);
        return;
      }
      ensureCity(codes);
      setReady(true);
    })();
  }, [ensureCity, load, toast, setReady]);

  React.useEffect(() => {
    if (!city || !user?.tgId) return;
    if (cart && cart.city === city) return;
    syncCart(city).catch(() => {});
  }, [cart, city, syncCart, user?.tgId]);

  React.useEffect(() => {
    (async () => {
      try {
        if (!user?.tgId) return;
        const params = new URLSearchParams(location.search || '');
        const ref = String(params.get('ref') || '').trim();
        if (!ref) return;
        const key = `ref_claimed:${user.tgId}:${ref}`;
        if (localStorage.getItem(key)) return;
        await referralAPI.claim(ref);
        localStorage.setItem(key, '1');
        params.delete('ref');
        navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
      } catch {
      }
    })();
  }, [location.pathname, location.search, navigate, user?.tgId]);

  React.useEffect(() => {
    const handleCartFly = (event: Event) => {
      const detail = (event as CustomEvent<CartFlyDetail>).detail;
      if (!detail) return;

      const target = document.querySelector('[data-cart-anchor="true"]');
      const targetRect = target?.getBoundingClientRect();
      if (!targetRect) {
        setCartPulseKey((prev) => prev + 1);
        return;
      }

      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + targetRect.height / 2;

      setFlyItems((prev) => [
        ...prev,
        {
          id,
          startX: detail.startX,
          startY: detail.startY,
          endX,
          endY,
          image: detail.image,
          active: false,
        },
      ]);

      window.setTimeout(() => {
        setFlyItems((prev) => prev.map((item) => (item.id === id ? { ...item, active: true } : item)));
      }, 16);

      window.setTimeout(() => {
        setCartPulseKey((prev) => prev + 1);
        setFlyItems((prev) => prev.filter((item) => item.id !== id));
      }, 720);
    };

    window.addEventListener(CART_FLY_EVENT, handleCartFly as EventListener);
    return () => {
      window.removeEventListener(CART_FLY_EVENT, handleCartFly as EventListener);
    };
  }, []);

  const cartCount = React.useMemo(
    () => (cart?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart],
  );

  return (
    <>
      <TopBar
        onMenuClick={showMenu ? () => setDrawerOpen(true) : () => undefined}
        onBackClick={() => navigate(-1)}
        onCartClick={() => navigate('/cart')}
        cartCount={cartCount}
        cartPulseKey={cartPulseKey}
        userName={user?.firstName}
        showBackButton={showBackButton}
        showSettings={user?.status === 'admin' && location.pathname === '/admin'}
        onSettingsClick={() => navigate('/admin')}
      />
      <DrawerMenu
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        cartItemsCount={cart?.items?.length || 0}
        userBalance={user?.bonusBalance || 0}
        userStatus={user?.status}
        city={city}
        onCityClick={() => {
          setDrawerOpen(false);
          setCityModalOpen(true);
        }}
      />
      <div style={{ paddingBottom: '104px' }}>
        <div className="page-transition">{children}</div>
      </div>
      {flyItems.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'fixed',
            left: item.startX - 20,
            top: item.startY - 20,
            width: 40,
            height: 40,
            borderRadius: 14,
            background: item.image
              ? `rgba(8,17,31,0.96) url(${item.image}) center/cover no-repeat`
              : 'linear-gradient(135deg, rgba(125,211,252,0.95) 0%, rgba(59,130,246,0.92) 100%)',
            border: '1px solid rgba(191,219,254,0.48)',
            boxShadow: '0 22px 40px rgba(15,23,42,0.42)',
            zIndex: 1800,
            pointerEvents: 'none',
            transform: item.active
              ? `translate(${item.endX - item.startX}px, ${item.endY - item.startY}px) scale(0.42)`
              : 'translate(0px, 0px) scale(1)',
            opacity: item.active ? 0.18 : 1,
            transition:
              'transform 680ms cubic-bezier(0.2, 0.85, 0.25, 1), opacity 680ms cubic-bezier(0.2, 0.85, 0.25, 1)',
          }}
        />
      ))}
      <FooterBar />
      <ToastHost />
      <CityPickerModal
        open={cityModalOpen}
        cities={(config?.cities || []).map((c) => ({ code: c.code, title: c.title || c.code }))}
        selectedCity={city}
        onSelect={(next) => {
          const prevCity = city;
          if (prevCity && prevCity !== next) {
            if (cart?.city && cart.city !== next) {
              setCart({ id: String(cart.id || ''), city: next, items: [], total: 0 });
            }
            cartAPI.clear(prevCity).catch(() => {});
            toast.push('Город изменён, корзина очищена', 'info');
          }
          setCity(next);
          setCityModalOpen(false);
        }}
        onClose={config?.cities?.length ? () => setCityModalOpen(false) : undefined}
      />
    </>
  );
};
