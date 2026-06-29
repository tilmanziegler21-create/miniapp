import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useAuthStore } from './store/useAuthStore';
import { authAPI } from './services/api';
import { SafeAreaProvider, AppShell } from './ui';
import { useBranding } from './hooks/useBranding';
import { useSplashStore } from './store/useSplashStore';
import { useConfigStore } from './store/useConfigStore';

const Home = React.lazy(() => import('./pages/Home'));
const Catalog = React.lazy(() => import('./pages/Catalog'));
const Product = React.lazy(() => import('./pages/Product'));
const Cart = React.lazy(() => import('./pages/Cart'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Orders = React.lazy(() => import('./pages/Orders'));
const OrderDetails = React.lazy(() => import('./pages/OrderDetails'));
const Favorites = React.lazy(() => import('./pages/Favorites'));
const Referral = React.lazy(() => import('./pages/Referral'));
const Support = React.lazy(() => import('./pages/Support'));
const Categories = React.lazy(() => import('./pages/Categories'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Courier = React.lazy(() => import('./pages/Courier'));
const Promotions = React.lazy(() => import('./pages/Promotions'));
const Bonuses = React.lazy(() => import('./pages/Bonuses'));
const FortuneWheel = React.lazy(() => import('./pages/FortuneWheel'));
const CourierRegistration = React.lazy(() => import('./pages/CourierRegistration'));

function App() {
  const branding = useBranding();
  const { load: loadConfig, config } = useConfigStore();
  const { user, setUser, setLoading, isLoading } = useAuthStore();
  const { isReady: isAppReady } = useSplashStore();
  const authStartedRef = React.useRef(false);
  const [authFinished, setAuthFinished] = React.useState(false);
  const [showSplash, setShowSplash] = React.useState(true);
  const [isFadingOut, setIsFadingOut] = React.useState(false);
  const mountTimeRef = React.useRef(Date.now());

  const safeAlert = (message: string) => {
    try {
      WebApp.showAlert(message);
    } catch {
      window.alert(message);
    }
  };

  useEffect(() => {
    // Only process fade out if auth has completed
    if (!authFinished) return;

    if (user) {
      if (isAppReady) {
        // Guarantee the splash screen shows for at least 1.5 seconds
        const elapsed = Date.now() - mountTimeRef.current;
        const delay = Math.max(0, 1500 - elapsed);
        
        const t1 = setTimeout(() => {
          setIsFadingOut(true);
          const t2 = setTimeout(() => setShowSplash(false), 500); // 500ms fade duration
        }, delay);
        return () => clearTimeout(t1);
      } else {
        // Fallback: if data takes too long or they are on another page, hide splash after 3 seconds total
        const fallback = setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => setShowSplash(false), 500);
        }, 3000);
        return () => clearTimeout(fallback);
      }
    } else {
      // If auth failed, hide splash immediately
      setShowSplash(false);
    }
  }, [authFinished, user, isAppReady]);

  useEffect(() => {
    try {
      WebApp.expand();
    } catch (e) {
      // Ignore
    }
    
    if (authStartedRef.current) return;
    authStartedRef.current = true;

    let cancelled = false;

    const withTimeout = async <T,>(promise: Promise<T>, ms: number) => {
      return await new Promise<T>((resolve, reject) => {
        const id = window.setTimeout(() => reject(new Error('AUTH_TIMEOUT')), ms);
        promise.then(
          (value) => {
            window.clearTimeout(id);
            resolve(value);
          },
          (err) => {
            window.clearTimeout(id);
            reject(err);
          },
        );
      });
    };

    const authenticate = async () => {
      setLoading(true);
      try {
        // Preload config parallel to auth
        loadConfig().catch(() => {});
        
        const forceDevAuth = import.meta.env.DEV && String(import.meta.env?.VITE_FORCE_DEV_AUTH || '') === '1';
        const storedToken = (() => {
          try {
            return localStorage.getItem('token');
          } catch {
            return null;
          }
        })();

        const innerAuth = async () => {
          if (storedToken) {
            try {
              const me = await authAPI.me();
              if (cancelled) return;
              setUser(me.data.user, storedToken);
              return;
            } catch {
              try {
                localStorage.removeItem('token');
              } catch {
                // ignore
              }
            }
          }

          const initData = WebApp.initData || (import.meta.env?.VITE_TG_INIT_DATA as string);
          if (!forceDevAuth && initData) {
            try {
              const response = await authAPI.verify(initData);
              if (cancelled) return;
              setUser(response.data.user, response.data.token);
              localStorage.setItem('token', response.data.token);
              return;
            } catch (e) {
              if (!import.meta.env.DEV) throw e;
            }
          }

          if (import.meta.env.DEV) {
            const response = await authAPI.dev();
            if (cancelled) return;
            setUser(response.data.user, response.data.token);
            localStorage.setItem('token', response.data.token);
            return;
          }

          throw new Error('No initData available');
        };

        await withTimeout(innerAuth(), import.meta.env.DEV ? 8000 : 15000);

      } catch (error) {
        console.error('Authentication failed:', error);
        if (String((error as any)?.message || '') === 'AUTH_TIMEOUT') {
          safeAlert('Сервер долго отвечает, попробуйте ещё раз');
        } else {
          safeAlert('Ошибка авторизации');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setAuthFinished(true);
        }
      }
    };

    authenticate();
    return () => {
      cancelled = true;
    };
  }, [setUser, setLoading]);

  if (authFinished && !user && !showSplash) {
    return (
      <SafeAreaProvider>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #08111f 0%, #0f1a2d 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#93c5fd', marginBottom: '16px', fontSize: '16px' }}>Ошибка авторизации</p>
            <button 
              onClick={() => WebApp.close()}
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {showSplash && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'linear-gradient(135deg, #08070a 0%, #0f172a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: 'opacity 0.5s ease-out',
          opacity: isFadingOut ? 0 : 1,
          pointerEvents: isFadingOut ? 'none' : 'auto'
        }}>
          {/* Animated fireflies on background */}
          <div className="fireflies-container">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="firefly" style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`
              }}></div>
            ))}
          </div>
          <div style={{ textAlign: 'center', zIndex: 10, animation: 'splashFadeIn 1s ease-out' }}>
            <div style={{
                width: '100px',
                height: '100px',
                background: 'linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(37,99,235,0.2) 100%)',
                borderRadius: '24px',
                margin: '0 auto 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 40px rgba(96,165,250,0.3)',
                border: '1px solid rgba(96,165,250,0.3)',
                animation: 'pulseGlow 2s infinite',
                overflow: 'hidden',
                opacity: config ? 1 : 0,
                transition: 'opacity 0.3s ease-in'
              }}>
                <img src={branding.brandAvatarUrl || "/favicon.svg"} alt="logo" style={{ width: branding.brandAvatarUrl ? '100%' : '60px', height: branding.brandAvatarUrl ? '100%' : '60px', objectFit: 'cover', filter: branding.brandAvatarUrl ? 'none' : 'drop-shadow(0 0 10px rgba(96,165,250,0.8))' }} />
              </div>
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.05em', opacity: config ? 1 : 0, transition: 'opacity 0.3s ease-in' }}>{branding.name}</h1>
            <p style={{ color: '#93c5fd', fontSize: '14px', opacity: config ? 0.8 : 0, textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'opacity 0.3s ease-in' }}>{branding.subtitle}</p>
          </div>
        </div>
      )}

      {user && (
        <Router>
          <div className="min-h-screen bg-app safe-bottom relative">
            {/* Animated fireflies on global background */}
            <div className="fireflies-container fixed">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="firefly" style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${5 + Math.random() * 5}s`
                }}></div>
              ))}
            </div>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<AppShell><Home /></AppShell>} />
                <Route path="/categories" element={<AppShell><Categories /></AppShell>} />
                <Route path="/catalog" element={<AppShell><Catalog /></AppShell>} />
                <Route path="/product/:id" element={<AppShell showMenu={false}><Product /></AppShell>} />
                <Route path="/cart" element={<AppShell showMenu={false}><Cart /></AppShell>} />
                <Route path="/orders" element={<AppShell><Orders /></AppShell>} />
                <Route path="/order/:id" element={<AppShell showMenu={false}><OrderDetails /></AppShell>} />
                <Route path="/favorites" element={<AppShell><Favorites /></AppShell>} />
                <Route path="/referral" element={<AppShell><Referral /></AppShell>} />
                <Route path="/support" element={<AppShell><Support /></AppShell>} />
                <Route path="/promotions" element={<AppShell><Promotions /></AppShell>} />
                <Route path="/bonuses" element={<AppShell><Bonuses /></AppShell>} />
                <Route path="/fortune" element={<AppShell><FortuneWheel /></AppShell>} />
                <Route path="/profile" element={<AppShell><Profile /></AppShell>} />
                <Route path="/courier" element={(user.status === 'courier' || user.status === 'admin') ? <AppShell><Courier /></AppShell> : <Navigate to="/home" replace />} />
                <Route path="/admin" element={user.status === 'admin' ? <AppShell><Admin /></AppShell> : <Navigate to="/home" replace />} />
                <Route path="/courier-registration" element={user.status === 'admin' ? <AppShell><CourierRegistration /></AppShell> : <Navigate to="/home" replace />} />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </Suspense>
          </div>
        </Router>
      )}
    </SafeAreaProvider>
  );
}

export default App;
