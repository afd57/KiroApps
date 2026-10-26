import { useState, useEffect, useCallback, useMemo } from 'react';

export interface AppApi {
  get: <T = any>(path: string) => Promise<T>;
  post: <T = any>(path: string, body?: any) => Promise<T>;
  put: <T = any>(path: string, body?: any) => Promise<T>;
  patch: <T = any>(path: string, body?: any) => Promise<T>;
  del: <T = any>(path: string) => Promise<T>;
}

export interface ChatLaunchOptions {
  agent?: string;
  message?: string;
  slotKey?: string;
  autoSend?: boolean;
}

declare global {
  interface Window {
    __kirocrew_modules?: Record<string, any>;
    __mc_chat_launch?: {
      agent?: string;
      message?: string;
      slotKey?: string;
      autoSend?: boolean;
      ts: number;
    };
  }
}

function getInjectedSdk() {
  if (typeof window !== 'undefined' && window.__kirocrew_modules?.['@kirocrew/app-sdk']) {
    return window.__kirocrew_modules['@kirocrew/app-sdk'];
  }
  return null;
}

export function isHostedInKiroCrew(): boolean {
  return Boolean(getInjectedSdk());
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export function useAppApi(): AppApi {
  const sdk = getInjectedSdk();
  if (sdk?.useAppApi) {
    return sdk.useAppApi();
  }

  return useMemo<AppApi>(
    () => ({
      get: (path) => fetchJson(path, { method: 'GET' }),
      post: (path, body) =>
        fetchJson(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
      put: (path, body) =>
        fetchJson(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
      patch: (path, body) =>
        fetchJson(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
      del: (path) => fetchJson(path, { method: 'DELETE' }),
    }),
    []
  );
}

export function useAppEvents(event: string, handler: (payload: any) => void): void {
  const sdk = getInjectedSdk();
  if (sdk?.useAppEvents) {
    sdk.useAppEvents(event, handler);
    return;
  }

  useEffect(() => {
    const listener = (e: Event) => {
      const custom = e as CustomEvent;
      handler(custom.detail);
    };
    window.addEventListener(`haru:${event}`, listener);
    window.addEventListener(`mc:app:${event}`, listener);
    return () => {
      window.removeEventListener(`haru:${event}`, listener);
      window.removeEventListener(`mc:app:${event}`, listener);
    };
  }, [event, handler]);
}

export function useNavigate(): (path: string) => void {
  const sdk = getInjectedSdk();
  if (sdk?.useNavigate) {
    return sdk.useNavigate();
  }

  return useCallback((path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);
}

export function useChatLauncher(): { openChat: (opts?: ChatLaunchOptions) => void } {
  const sdk = getInjectedSdk();
  if (sdk?.useChatLauncher) {
    return sdk.useChatLauncher();
  }

  const navigate = useNavigate();
  const openChat = useCallback(
    (opts: ChatLaunchOptions = {}) => {
      if (typeof window !== 'undefined') {
        window.__mc_chat_launch = {
          agent: opts.agent,
          message: opts.message,
          slotKey: opts.slotKey,
          autoSend: opts.autoSend,
          ts: Date.now(),
        };
      }
      if (opts.slotKey) {
        navigate(`/chat?sid=${encodeURIComponent(opts.slotKey)}`);
      } else if (opts.autoSend === false) {
        navigate('/chat?new=1');
      } else {
        navigate('/chat');
      }
    },
    [navigate]
  );

  return { openChat };
}

export function useNotify(): (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void {
  const sdk = getInjectedSdk();
  if (sdk?.useNotify) {
    return sdk.useNotify();
  }

  return useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    window.dispatchEvent(
      new CustomEvent('haru:toast', {
        detail: { id: `${Date.now()}-${Math.random()}`, message, type },
      })
    );
  }, []);
}

export function useTheme() {
  const sdk = getInjectedSdk();
  if (sdk?.useTheme) {
    const kiroTheme = sdk.useTheme();
    const mode: 'dark' | 'light' = kiroTheme?.mode === 'light' ? 'light' : 'dark';
    return {
      theme: mode,
      mode,
      isHosted: true,
      toggleTheme: () => {
        // Hosted inside KiroCrew: KiroCrew manages its own theme globally
      },
      setTheme: () => {},
    };
  }

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const docTheme = document.documentElement.getAttribute('data-theme');
    if (docTheme === 'light' || docTheme === 'dark') return docTheme;
    const saved = localStorage.getItem('haru.theme.v1');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    // Only set attribute in standalone mode outside KiroCrew
    if (!isHostedInKiroCrew()) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('haru.theme.v1', theme);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    if (!isHostedInKiroCrew()) {
      setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }
  }, []);

  return { theme, mode: theme, isHosted: false, toggleTheme, setTheme };
}
