const DEFAULT_PUBLIC_API_URL = "/api/backend";
const DEFAULT_INTERNAL_API_URL = "http://127.0.0.1:8000/api/v1";

function cleanUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export const publicEnv = {
  apiUrl: cleanUrl(process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_PUBLIC_API_URL),
};

export function getInternalApiUrl() {
  return cleanUrl(process.env.INTERNAL_API_URL ?? DEFAULT_INTERNAL_API_URL);
}
