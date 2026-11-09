import type { Content } from './content';
import type { Project } from './projects';
import type { StackItem } from './stack';

/** Base URL of the `api` Neon Function, resolved from .env.local in vite.config.ts. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new ApiError('The API URL is not configured. Run `neon env pull`.', 0);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError('Could not reach the API. Check your connection and try again.', 0);
  }
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new ApiError(body?.error ?? `Request failed (${res.status}).`, res.status);
  return body as T;
}

/** The previous API sent the stack as "A, B, C"; the current one sends a list of items. */
function normalizeStack(raw: unknown): StackItem[] {
  if (typeof raw === 'string') {
    return raw.split(',').flatMap((s) => (s.trim() ? [{ name: s.trim(), icon: null, hex: null }] : []));
  }
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s: Partial<StackItem>) =>
    typeof s?.name === 'string' ? [{ name: s.name, icon: s.icon ?? null, hex: s.hex ?? null }] : [],
  );
}

/**
 * Accepts both shapes of a project: `images` (a list) from the current API, or the
 * single `image` and text stack the previous API sent, so the site works while either is deployed.
 */
export function normalizeProjects(raw: unknown): Project[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p: Omit<Project, 'stack'> & { image?: string | null; stack: unknown }) => {
    const { image, ...rest } = p;
    const images = Array.isArray(p.images) ? p.images.filter((id) => typeof id === 'string') : image ? [image] : [];
    const duties = Array.isArray(p.duties) ? p.duties.filter((d) => typeof d === 'string') : [];
    return { ...rest, images, stack: normalizeStack(p.stack), duties, url: p.url ?? null };
  });
}

export const fetchContent = async (signal?: AbortSignal): Promise<Content> => {
  const c = await request<Content>('/content', { signal });
  return { ...c, projects: normalizeProjects(c.projects) };
};

export function adminRequest<T>(key: string, method: 'GET' | 'PUT', path: string, body?: unknown) {
  return request<T>(`/admin${path}`, {
    method,
    headers: { 'X-Admin-Key': key, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const logoUrl = (id: string) => `${API_URL}/logo/${id}`;
export const shotUrl = (id: string) => `${API_URL}/shot/${id}`;

const putImage = <T,>(key: string, path: string, file: File) =>
  request<T>(path, {
    method: 'PUT',
    headers: { 'X-Admin-Key': key, 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });

export const uploadLogo = (key: string, file: File) => putImage<{ logo: string }>(key, '/admin/logo', file);
export const uploadShot = (key: string, file: File) => putImage<{ image: string }>(key, '/admin/shot', file);

export function uploadCv(key: string, file: File) {
  return request<{ cv: Content['cv'] }>('/admin/cv', {
    method: 'PUT',
    headers: {
      'X-Admin-Key': key,
      'Content-Type': 'application/pdf',
      'X-Filename': encodeURIComponent(file.name),
    },
    body: file,
  });
}
