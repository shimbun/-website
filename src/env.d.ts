/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_ENV?: 'production' | 'staging';
  readonly PUBLIC_GTM_ID?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly PUBLIC_TIMEREX_URL?: string;
}

interface Window {
  dataLayer: Record<string, unknown>[];
  gtag?: (...args: unknown[]) => void;
  turnstile?: { reset: (el?: string | HTMLElement) => void };
}
