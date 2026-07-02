import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useAuthStore } from '../store/useAuthStore';

const NO_MENU_PREFIXES = ['/product/', '/cart', '/order/'];

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const showMenu = !NO_MENU_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));

  if (location.pathname === '/courier' && user?.status !== 'courier' && user?.status !== 'admin') {
    return <Navigate to="/home" replace />;
  }
  if (location.pathname === '/admin' && user?.status !== 'admin') {
    return <Navigate to="/home" replace />;
  }
  if (location.pathname === '/courier-registration' && user?.status !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return (
    <AppShell showMenu={showMenu}>
      <Outlet />
    </AppShell>
  );
};
