declare namespace NodeJS {
  interface ProcessEnv {
    POSTGRES_URL?: string;
    secrets?: {
      POSTGRES_URL?: string;
    };
  }
}
