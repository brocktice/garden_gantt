/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PERMAPEOPLE_BASE_URL?: string;
  readonly VITE_PERMAPEOPLE_KEY_ID?: string;
  readonly VITE_PERMAPEOPLE_KEY_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
