/** Same-origin by default; set VITE_API_BASE_URL when the API runs on another host. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export async function readApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const body = await response.text();
  let payload: unknown;

  if (body && contentType.includes('json')) {
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error(`API returned invalid JSON (HTTP ${response.status}).`);
    }
  } else if (body) {
    const snippet = body.replace(/\s+/g, ' ').trim().slice(0, 180);
    const likelyHtml = contentType.includes('html') || /^(<!doctype html|<html)/i.test(snippet);
    throw new Error(
      `API returned ${likelyHtml ? 'an HTML page' : 'plain text'} instead of JSON (HTTP ${response.status})${snippet ? `: ${snippet}` : '.'}`
    );
  } else if (!response.ok) {
    throw new Error(`API request failed (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const error = payload && typeof payload === 'object' && 'error' in payload
      ? (payload as { error?: unknown }).error
      : undefined;
    throw new Error(typeof error === 'string' ? error : `API request failed (HTTP ${response.status}).`);
  }
  return payload as T;
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
