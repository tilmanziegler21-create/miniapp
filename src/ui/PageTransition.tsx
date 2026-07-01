import React from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const TAB_ROUTES = new Set(['/home', '/cart', '/orders', '/profile']);

type Props = {
  children: React.ReactNode;
};

export const PageTransition: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathRef = React.useRef(location.pathname);
  const [mode, setMode] = React.useState<'tab' | 'forward' | 'back'>('forward');

  React.useLayoutEffect(() => {
    const from = prevPathRef.current;
    const to = location.pathname;
    prevPathRef.current = to;

    if (TAB_ROUTES.has(from) && TAB_ROUTES.has(to)) {
      setMode('tab');
    } else if (navigationType === 'POP') {
      setMode('back');
    } else {
      setMode('forward');
    }
  }, [location.pathname, navigationType]);

  return (
    <div key={location.pathname} className={`page-transition page-transition--${mode}`}>
      {children}
    </div>
  );
};
