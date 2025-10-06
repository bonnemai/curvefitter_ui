const defaultConfig = {
  STREAM_URL: 'https://2pzmybbrkdhzf75k6wz24dflua0hbiko.lambda-url.eu-west-2.on.aws',
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
