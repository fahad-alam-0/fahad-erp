import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { ROUTES } from '@/constants/routes.constants';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock, Mail, Loader2 } from 'lucide-react';

import { authService } from '@/services/authentication/authService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoading, error, setError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetSentMessage, setResetSentMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.DASHBOARD;

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address to receive a password reset link.');
      return;
    }
    setError(null);
    setResetSentMessage(null);
    setIsResetLoading(true);
    const res = await authService.resetPasswordForEmail(email.trim());
    setIsResetLoading(false);
    if (!res.success) {
      setError(res.error || 'Failed to send reset link.');
    } else {
      setResetSentMessage('Password reset link sent to your email. Please check your inbox.');
    }
  };

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
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isResetLoading}
              className="text-xs text-primary hover:underline font-medium"
            >
              {isResetLoading ? 'Sending...' : 'Forgot Password?'}
            </button>
          </div>
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

        {resetSentMessage && (
          <div className="p-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
            {resetSentMessage}
          </div>
        )}

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
