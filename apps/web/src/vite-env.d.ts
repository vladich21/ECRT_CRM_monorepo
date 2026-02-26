interface ImportMetaEnv {
  readonly VITE_AUTH_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_FILE_URL: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  // добавьте другие переменные по необходимости
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
