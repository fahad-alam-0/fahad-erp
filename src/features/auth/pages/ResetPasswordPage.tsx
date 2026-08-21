import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ROUTES } from '@/constants/routes.constants';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Lock, ArrowLeft } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Listen for recovery event or verify active recovery session
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setIsSessionValid(true);
        setError(null);
      }
    });

    // Initial check for existing recovery session
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError || !session) {
        // If hash contains error parameter like otp_expired
        if (window.location.hash.includes('error=') || window.location.search.includes('error=')) {
          setIsSessionValid(false);
          setError('Password reset link is invalid or has expired. Please request a new reset link.');
        } else {
          // Give listener a brief moment to process hash tokens
          setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
              if (currentSession) {
                setIsSessionValid(true);
              } else if (isSessionValid === null) {
                setIsSessionValid(false);
                setError('Password reset link is invalid or has expired. Please request a new reset link.');
              }
            });
          }, 1000);
        }
      } else {
        setIsSessionValid(true);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [isSessionValid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update password. Please try again.');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);

      // Sign out user after reset to force fresh authentication with new password
      await supabase.auth.signOut();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <Header
        title="Reset Password"
        subtitle="Set a new secure password for your Fahad ERP account"
      />

      {isSuccess ? (
        <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <h3 className="font-semibold text-sm">Password Updated Successfully</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Your password has been updated. You can now sign in using your new credentials.
          </p>
          <Button
            onClick={() => navigate(ROUTES.AUTH.LOGIN)}
            className="w-full mt-2"
          >
            Return to Sign In
          </Button>
        </div>
      ) : isSessionValid === false ? (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <h3 className="font-semibold text-sm">Invalid or Expired Link</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {error || 'Password reset link is invalid or has expired. Please request a new reset link.'}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(ROUTES.AUTH.LOGIN)}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="new-password">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password (min. 6 chars)"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                required
                minLength={6}
                disabled={isLoading}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="confirm-password">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 animate-spin" /> Updating Password...
              </span>
            ) : (
              'Update Password'
            )}
          </Button>

          <div className="text-center">
            <Link
              to={ROUTES.AUTH.LOGIN}
              className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};
