// packages/config/src/index.ts

const env = (key: string): string => {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key] as string;
  }
  // @ts-ignore
  if (typeof import.meta !== "undefined" && import.meta.env?.[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return "";
};

export const apiConfig = {
  baseUrl:
    env("VITE_API_URL") || env("REACT_APP_API_URL") || "http://localhost:3000",
  endpoints: {
    user : {
      me: "/api/users/me",
      onboard: "/api/users/onboard",
    },
    auth: {
      onboard: "/api/users/onboard",
      flags: "/api/users/me/flags",
    },
    resume: {
      upload: "/api/resume/upload",
    },
    unstop: {
      requestSetup: "/api/sessions/unstop/request-setup",
      status: "/api/sessions/unstop/status",
      submit: "/api/sessions/unstop/submit",
    },
    health: "/api/health",
  },
};

export function getApiUrl(endpoint: string): string {
  return `${apiConfig.baseUrl}${endpoint}`;
}

export const dbConfig = {
  url: env("DATABASE_URL"),
};

export const supabaseConfig = {
  url: env("SUPABASE_URL"),
  anonKey: env("SUPABASE_ANON_KEY"),
};

export const storageConfig = {
  endpoint: env("R2_ENDPOINT_URL"),
  accessKeyId: env("R2_ACCESS_KEY_ID"),
  secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
  bucketName: env("R2_BUCKET_NAME"),
  publicUrl: env("R2_PUBLIC_URL"),
};

export const encryptionConfig = {
  cookieEncryptionKey: env("COOKIE_ENCRYPTION_KEY"),
};

export const publicConfig = {
  apiUrl: env("PUBLIC_API_URL") || "http://localhost:3000",
};

export const envConfig = {
  isDevelopment: env("NODE_ENV") === "development",
  isProduction: env("NODE_ENV") === "production",
  environment: env("NODE_ENV") || "development",
  version: env("npm_package_version") || "0.0.0",
};

export const enableJobsConfig = {
  unstop: {
    id: "unstop",
    displayName: "Unstop",

    session: {
      type: "cookie", 
    },

    jobs: {
      internship: {
        flag: "isUnstopInternshipEnabled",
        label: "Internships",
        action: "Apply",
      },
      job: {
        flag: "isUnstopJobEnabled",
        label: "Jobs",
        action: "Apply",
      },
    },

    extras: {
    },
  },

  commudle: {
    id: "commudle",
    displayName: "Commudle",

    session: {
      type: "cookie",
    },

    jobs: {
      events: {
        flag: "isCommudleEventEnabled",
        label: "Events",
        action: "Register",
      },
    },

    extras: {},
  },
} as const;