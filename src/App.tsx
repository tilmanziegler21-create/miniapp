import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useAuthStore } from './store/useAuthStore';
import { authAPI } from './services/api';
import { SafeAreaProvider, AppLayout, SplashScreen } from './ui';
import { useBootStore } from './store/useBootStore';
import { useConfigStore } from './store/useConfigStore';
import { runBootPipeline } from './lib/boot';

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
  const { load: loadConfig } = useConfigStore();
  const { user, setUser, setLoading } = useAuthStore();
  const isBootReady = useBootStore((state) => state.isReady);
  const authStartedRef = React.useRef(false);
  const bootStartedRef = React.useRef(false);
  const [authFinished, setAuthFinished] = React.useState(false);
  const [showSplash, setShowSplash] = React.useState(true);
  const [isFadingOut, setIsFadingOut] = React.useState(false);
  const mountTimeRef = React.useRef(Date.now());

  const startParam = React.useMemo(() => {
    try {
      return String(WebApp.initDataUnsafe?.start_param || '').trim();
    } catch {
      return '';
    }
  }, []);

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

    let hideSplashTimer: number | undefined;

    if (user) {
      if (isBootReady) {
        const elapsed = Date.now() - mountTimeRef.current;
        const delay = Math.max(0, 520 - elapsed);

        const t1 = window.setTimeout(() => {
          setIsFadingOut(true);
          hideSplashTimer = window.setTimeout(() => setShowSplash(false), 380);
        }, delay);
        return () => {
          window.clearTimeout(t1);
          if (hideSplashTimer) window.clearTimeout(hideSplashTimer);
        };
      } else {
        // Fallback: don't trap the user behind splash for too long
        const fallback = window.setTimeout(() => {
          setIsFadingOut(true);
          hideSplashTimer = window.setTimeout(() => setShowSplash(false), 380);
        }, 3000);
        return () => {
          window.clearTimeout(fallback);
          if (hideSplashTimer) window.clearTimeout(hideSplashTimer);
        };
      }
    } else {
      // If auth failed, hide splash immediately
      setShowSplash(false);
    }
  }, [authFinished, user, isBootReady]);

  useEffect(() => {
    if (!user?.tgId || bootStartedRef.current) return;
    bootStartedRef.current = true;
    runBootPipeline(user.tgId);
  }, [user?.tgId]);

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
      useBootStore.getState().setProgress(8, 'Проверяем доступ…');
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
      {showSplash && <SplashScreen fadingOut={isFadingOut} />}

      {user && (
        <Router>
          <div className="min-h-screen bg-app safe-bottom relative">
            <div className="app-content-layer">
            <Suspense
              fallback={
                <div style={{ padding: '20px 16px 120px' }}>
                  <div
                    style={{
                      height: 220,
                      borderRadius: 26,
                      border: '1px solid rgba(96,165,250,0.10)',
                      background: 'rgba(16,15,18,0.78)',
                    }}
                    className="animate-pulse"
                  />
                </div>
              }
            >
              <Routes>
                <Route
                  path="/"
                  element={
                    <Navigate
                      to={
                        startParam === 'courier' && (user.status === 'courier' || user.status === 'admin')
                          ? '/courier'
                          : '/home'
                      }
                      replace
                    />
                  }
                />
                <Route element={<AppLayout />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/product/:id" element={<Product />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/order/:id" element={<OrderDetails />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/referral" element={<Referral />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/promotions" element={<Promotions />} />
                  <Route path="/bonuses" element={<Bonuses />} />
                  <Route path="/fortune" element={<FortuneWheel />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/courier" element={<Courier />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/courier-registration" element={<CourierRegistration />} />
                </Route>
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </Suspense>
            </div>
          </div>
        </Router>
      )}
    </SafeAreaProvider>
  );
}

export default App;
