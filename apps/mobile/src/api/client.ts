const configuredApiBaseUrl = process.env.MOBILE_API_BASE_URL;

if (!configuredApiBaseUrl) {
  throw new Error('MOBILE_API_BASE_URL must be configured for the mobile app.');
}

const apiBaseUrl = configuredApiBaseUrl.replace(/\/+$/, '');

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}