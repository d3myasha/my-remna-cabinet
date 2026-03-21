import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/shallow';
import { useAuthStore } from '../store/auth';
import {
  brandingApi,
  getCachedBranding,
  setCachedBranding,
  preloadLogo,
  isLogoPreloaded,
  type BrandingInfo,
} from '../api/branding';
import { getAndClearReturnUrl } from '../utils/token';
import { useTelegramSDK } from '../hooks/useTelegramSDK';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, loginWithApiKey } = useAuthStore(
    useShallow((state) => ({
      isAuthenticated: state.isAuthenticated,
      loginWithApiKey: state.loginWithApiKey,
    })),
  );

  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(() => isLogoPreloaded());

  const { safeAreaInset, contentSafeAreaInset } = useTelegramSDK();
  const safeTop = Math.max(safeAreaInset.top, contentSafeAreaInset.top);
  const safeBottom = Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom);

  const getReturnUrl = useCallback(() => {
    const stateFrom = (location.state as { from?: string })?.from;
    if (stateFrom && stateFrom !== '/login') {
      return stateFrom;
    }

    const savedUrl = getAndClearReturnUrl();
    if (savedUrl && savedUrl !== '/login') {
      return savedUrl;
    }

    return '/';
  }, [location.state]);

  const cachedBranding = useMemo(() => getCachedBranding(), []);

  const { data: branding } = useQuery<BrandingInfo>({
    queryKey: ['branding'],
    queryFn: async () => {
      const data = await brandingApi.getBranding();
      setCachedBranding(data);
      await preloadLogo(data);
      return data;
    },
    staleTime: 60000,
    initialData: cachedBranding ?? undefined,
    initialDataUpdatedAt: 0,
  });

  const appName = branding ? branding.name : import.meta.env.VITE_APP_NAME || 'RemnaWave Cabinet';
  const appLogo = branding?.logo_letter || import.meta.env.VITE_APP_LOGO || 'R';
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null;

  useEffect(() => {
    document.title = appName;
  }, [appName]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getReturnUrl(), { replace: true });
    }
  }, [isAuthenticated, navigate, getReturnUrl]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const normalized = apiKey.trim();
    if (!normalized) {
      setError(t('auth.apiKeyRequired', 'API key is required'));
      return;
    }

    setIsLoading(true);
    try {
      await loginWithApiKey(normalized);
      navigate(getReturnUrl(), { replace: true });
    } catch (err: unknown) {
      const response = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = response.response?.status;
      const detail = response.response?.data?.detail;

      if (status === 401 || status === 403) {
        setError(t('auth.invalidApiKey', 'Invalid API key'));
      } else {
        setError(detail || t('common.error', 'Something went wrong'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center px-4 sm:px-6 lg:px-8"
      style={{
        paddingTop:
          safeTop > 0 ? `${safeTop + 16}px` : 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom:
          safeBottom > 0
            ? `${safeBottom + 16}px`
            : 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-500/10 via-transparent to-transparent" />

      <div className="relative w-full max-w-md">
        <div className="absolute -top-14 right-0">
          <LanguageSwitcher />
        </div>

        <div className="card border border-dark-800/50 bg-dark-900/70 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-accent-500/20 text-2xl font-bold text-accent-400">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={appName}
                  className={`h-full w-full object-cover transition-opacity duration-300 ${
                    logoLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => setLogoLoaded(false)}
                />
              ) : null}
              {!logoUrl || !logoLoaded ? <span>{appLogo}</span> : null}
            </div>
            <h1 className="mb-2 text-2xl font-bold text-dark-50">{appName}</h1>
            <p className="text-sm text-dark-400">
              {t('auth.loginSubtitleApiKey', 'Enter your RemnaWave panel API key')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="apiKey" className="mb-2 block text-sm font-medium text-dark-300">
                {t('auth.apiKey', 'API key')}
              </label>
              <textarea
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('auth.apiKeyPlaceholder', 'Paste API key from RemnaWave panel')}
                autoComplete="off"
                rows={4}
                className="input min-h-[100px] resize-y"
                disabled={isLoading}
              />
              <p className="mt-2 text-xs text-dark-500">
                {t(
                  'auth.apiKeyHint',
                  'The key is stored locally in this browser and sent only to your panel API.',
                )}
              </p>
            </div>

            {error ? (
              <div className="rounded-lg border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-400">
                {error}
              </div>
            ) : null}

            <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:opacity-60">
              {isLoading
                ? t('auth.authenticating', 'Authenticating...')
                : t('auth.loginWithApiKey', 'Login with API key')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

