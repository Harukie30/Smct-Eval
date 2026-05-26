export const CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_API_URL,
  API_URL_STORAGE: process.env.NEXT_PUBLIC_STORAGE_URL,
  SANCTUM_API_URL: process.env.NEXT_PUBLIC_SANCTUM_API_URL,
  /** Employee / company app portal (footer link on login page). Override in .env.local */
  APP_PORTAL_URL:
    process.env.NEXT_PUBLIC_APP_PORTAL_URL ?? "https://portal.smctgroup.ph",

  REVERB_KEY: process.env.NEXT_PUBLIC_REVERB_KEY!,
  REVERB_API_URL: process.env.NEXT_PUBLIC_REVERB_API_URL,
  REVERB_HOST: process.env.NEXT_PUBLIC_REVERB_HOST,
  REVERB_PORT: Number(process.env.NEXT_PUBLIC_REVERB_PORT),
  REVERB_SCHEME: process.env.NEXT_PUBLIC_REVERB_SCHEME,
};
