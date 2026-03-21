import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { authApi } from '../api/auth';
import { useToast } from '../components/Toast';
import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';
import ProviderIcon from '../components/ProviderIcon';
import { LINK_OAUTH_STATE_KEY, LINK_OAUTH_PROVIDER_KEY, getErrorDetail } from '../utils/oauth';
import type { LinkedProvider } from '../types';
import { TELEGRAM_ACCOUNT_LINKING_ENABLED } from '@/config/webFeatures';

const OAUTH_PROVIDERS = ['google', 'yandex', 'discord', 'vk'];

const isOAuthProvider = (provider: string): boolean => OAUTH_PROVIDERS.includes(provider);

const isLinkableProvider = (provider: string): boolean => isOAuthProvider(provider);

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <div className="flex animate-pulse items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-dark-700" />
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-dark-700" />
                <div className="h-3 w-32 rounded bg-dark-700" />
              </div>
            </div>
            <div className="h-8 w-20 rounded bg-dark-700" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ConnectedAccounts() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [confirmingUnlink, setConfirmingUnlink] = useState<string | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [waitingExternalLink, setWaitingExternalLink] = useState(false);
  const pendingLinkProvider = useRef<string | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['linked-providers'],
    queryFn: () => authApi.getLinkedProviders(),
    refetchOnWindowFocus: true,
    // Poll every 5s while waiting for external browser OAuth to complete
    refetchInterval: waitingExternalLink ? 5000 : false,
  });

  // Stop polling after 90 seconds with timeout feedback
  useEffect(() => {
    if (!waitingExternalLink) return;
    const timeout = setTimeout(() => {
      setWaitingExternalLink(false);
      pendingLinkProvider.current = null;
      // Final refresh in case link succeeded during the last polling interval
      queryClient.invalidateQueries({ queryKey: ['linked-providers'] });
      showToast({ type: 'warning', message: t('profile.accounts.pollingTimeout') });
    }, 90_000);
    return () => clearTimeout(timeout);
  }, [waitingExternalLink, showToast, t, queryClient]);

  // Detect successful external link: stop polling when the target provider becomes linked
  useEffect(() => {
    if (!waitingExternalLink || !data || !pendingLinkProvider.current) return;
    const target = data.providers.find((p) => p.provider === pendingLinkProvider.current);
    if (target?.linked) {
      setWaitingExternalLink(false);
      pendingLinkProvider.current = null;
      showToast({ type: 'success', message: t('profile.accounts.linkSuccess') });
    }
  }, [data, waitingExternalLink, showToast, t]);

  const unlinkMutation = useMutation({
    mutationFn: (provider: string) => authApi.unlinkProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-providers'] });
      showToast({
        type: 'success',
        message: t('profile.accounts.unlinkSuccess'),
      });
    },
    onError: () => {
      showToast({
        type: 'error',
        message: t('profile.accounts.unlinkError'),
      });
    },
    onSettled: () => {
      setConfirmingUnlink(null);
    },
  });

  const canUnlink = (provider: LinkedProvider): boolean => {
    if (!provider.linked) return false;
    if (!isOAuthProvider(provider.provider)) return false;
    const linkedCount = data?.providers.filter((p) => p.linked).length ?? 0;
    return linkedCount > 1;
  };

  const handleLinkOAuth = async (provider: string) => {
    if (linkingProvider) return;
    setLinkingProvider(provider);
    try {
      const { authorize_url, state } = await authApi.linkProviderInit(provider);
      if (!authorize_url || !state) {
        throw new Error('Invalid response from server');
      }

      // Validate redirect URL — only allow HTTPS to prevent open redirect
      let parsed: URL;
      try {
        parsed = new URL(authorize_url);
      } catch {
        throw new Error('Invalid OAuth redirect URL');
      }
      if (parsed.protocol !== 'https:') {
        throw new Error('Invalid OAuth redirect URL');
      }

      // Browser flow: save state for callback verification and navigate.
      sessionStorage.setItem(LINK_OAUTH_STATE_KEY, state);
      sessionStorage.setItem(LINK_OAUTH_PROVIDER_KEY, provider);
      window.location.href = authorize_url;
    } catch (err: unknown) {
      showToast({
        type: 'error',
        message: getErrorDetail(err) || t('profile.accounts.linkError'),
      });
      setLinkingProvider(null);
    }
  };

  const handleLink = async (provider: string) => {
    await handleLinkOAuth(provider);
  };

  const handleUnlink = (provider: string) => {
    if (confirmingUnlink === provider) {
      setConfirmingUnlink(null);
      unlinkMutation.mutate(provider);
    } else {
      setConfirmingUnlink(provider);
    }
  };

  const renderLinkButton = (provider: LinkedProvider) => {
    if (isOAuthProvider(provider.provider)) {
      return (
        <Button
          variant="primary"
          size="sm"
          disabled={linkingProvider !== null || waitingExternalLink}
          loading={linkingProvider === provider.provider}
          onClick={() => handleLink(provider.provider)}
        >
          {t('profile.accounts.link')}
        </Button>
      );
    }

    return null;
  };

  const providers = (data?.providers ?? []).filter(
    (provider) => TELEGRAM_ACCOUNT_LINKING_ENABLED || provider.provider !== 'telegram',
  );

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Page title */}
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">
          {t('profile.accounts.title')}
        </h1>
        <p className="mt-1 text-dark-400">{t('profile.accounts.subtitle')}</p>
      </motion.div>

      {/* Loading state */}
      {isLoading && (
        <motion.div variants={staggerItem}>
          <LoadingSkeleton />
        </motion.div>
      )}

      {/* Error state */}
      {isError && (
        <motion.div variants={staggerItem}>
          <Card>
            <p className="text-center text-dark-400">{t('common.error')}</p>
          </Card>
        </motion.div>
      )}

      {/* Provider cards */}
      {providers.map((provider) => (
        <motion.div key={provider.provider} variants={staggerItem}>
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ProviderIcon provider={provider.provider} />
                <div>
                  <p className="font-medium text-dark-100">
                    {t(`profile.accounts.providers.${provider.provider}`)}
                  </p>
                  {provider.identifier && (
                    <p className="text-sm text-dark-400">{provider.identifier}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {provider.linked ? (
                  <>
                    <span className="text-sm text-success-500">{t('profile.accounts.linked')}</span>
                    {canUnlink(provider) && (
                      <Button
                        variant={confirmingUnlink === provider.provider ? 'destructive' : 'outline'}
                        size="sm"
                        disabled={unlinkMutation.isPending}
                        loading={
                          unlinkMutation.isPending && unlinkMutation.variables === provider.provider
                        }
                        onClick={() => handleUnlink(provider.provider)}
                        onBlur={() => {
                          blurTimeoutRef.current = setTimeout(() => {
                            setConfirmingUnlink((cur) => (cur === provider.provider ? null : cur));
                          }, 150);
                        }}
                      >
                        {confirmingUnlink === provider.provider
                          ? t('profile.accounts.unlinkConfirmBtn')
                          : t('profile.accounts.unlink')}
                      </Button>
                    )}
                  </>
                ) : (
                  isLinkableProvider(provider.provider) && renderLinkButton(provider)
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
