/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the CvAnalyzer.Api backend, e.g. http://localhost:5285 */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
