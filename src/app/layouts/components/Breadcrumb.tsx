import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { ROUTES } from '@/constants/routes.constants';

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex items-center space-x-1 text-xs text-muted-foreground mb-4">
      <Link to={ROUTES.DASHBOARD} className="flex items-center hover:text-foreground">
        <Home className="h-3.5 w-3.5 mr-1" />
        <span>Dashboard</span>
      </Link>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return (
          <React.Fragment key={to}>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            {isLast ? (
              <span className="font-semibold text-foreground capitalize">{value.replace('-', ' ')}</span>
            ) : (
              <Link to={to} className="hover:text-foreground capitalize">
                {value.replace('-', ' ')}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
