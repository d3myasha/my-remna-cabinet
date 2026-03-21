import { useCallback } from 'react';

const FULLSCREEN_CACHE_KEY = 'cabinet_fullscreen_enabled';

export const getCachedFullscreenEnabled = (): boolean => {
  try {
    return localStorage.getItem(FULLSCREEN_CACHE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setCachedFullscreenEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(FULLSCREEN_CACHE_KEY, String(enabled));
  } catch {}
};

let _isInTelegram: boolean | null = null;
function detectTelegram(): boolean {
  if (_isInTelegram === null) {
    _isInTelegram = false;
  }
  return _isInTelegram;
}

export function isInTelegramWebApp(): boolean {
  return detectTelegram();
}

export function isTelegramMobile(): boolean {
  return false;
}

export function getTelegramInitData(): string | null {
  return null;
}

export type TelegramPlatform =
  | 'android'
  | 'ios'
  | 'tdesktop'
  | 'macos'
  | 'weba'
  | 'webk'
  | 'unigram'
  | 'unknown'
  | undefined;

const defaultInsets = { top: 0, bottom: 0, left: 0, right: 0 };

export function useTelegramSDK() {
  const inTelegram = false;
  const platform: TelegramPlatform = undefined;
  const isMobile = false;
  const isFullscreen = false;
  const viewportHeight = 0;
  const viewportStableHeight = 0;
  const isExpanded = true;
  const safeAreaInset = defaultInsets;
  const contentSafeAreaInset = defaultInsets;

  const requestFullscreen = useCallback(() => {
    return;
  }, []);

  const exitFullscreen = useCallback(() => {
    return;
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
  }, [isFullscreen, requestFullscreen, exitFullscreen]);

  const expand = useCallback(() => {
    return;
  }, []);

  const disableVerticalSwipes = useCallback(() => {
    return;
  }, []);

  const enableVerticalSwipes = useCallback(() => {
    return;
  }, []);

  const isFullscreenSupported = false;

  return {
    isTelegramWebApp: inTelegram,
    isFullscreen,
    isFullscreenSupported,
    safeAreaInset,
    contentSafeAreaInset,
    viewportHeight,
    viewportStableHeight,
    viewportWidth: 0,
    isExpanded,
    platform,
    isMobile,
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
    expand,
    disableVerticalSwipes,
    enableVerticalSwipes,
    viewport: null,
    miniApp: null,
  };
}
