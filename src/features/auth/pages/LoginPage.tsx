import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { ROUTES } from '@/constants/routes.constants';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock, Mail, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoading, error, setError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.DASHBOARD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email address and password.');
      return;
    }

    const success = await signIn(email.trim(), password);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <Header
        title="Sign In"
        subtitle="Access Fahad ERP Management Console"
      />

      {error && (
        <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. staff@fahad-erp.com"
            required
            disabled={isLoading}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="••••••••"
            required
            disabled={isLoading}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || !email.trim() || !password.trim()}
          className="w-full h-10 font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Signing In...
            </>
          ) : (
            'Sign In to Console'
          )}
        </Button>
      </form>
    </div>
  );
};
