/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONGRESS_API_KEY: string
  readonly VITE_OPENSTATES_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
