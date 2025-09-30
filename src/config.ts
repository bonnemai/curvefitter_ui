const defaultConfig = {
  STREAM_URL: 'http://localhost:8000/curves/stream',
  APP_ENV: 'dev',
};

type AppConfig = typeof defaultConfig;

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

const runtimeConfig = window.__APP_CONFIG__ ?? {};

export const appConfig: AppConfig = {
  ...defaultConfig,
  ...runtimeConfig,
};
