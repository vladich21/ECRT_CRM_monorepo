interface ImportMetaEnv {
  readonly VITE_AUTH_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_FILE_URL: string;
  readonly VITE_PARTNER_CREATE_RESTRICTED: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@svar-ui/react-gantt/all.css';
