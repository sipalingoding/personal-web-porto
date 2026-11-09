import { HTTPException } from 'hono/http-exception';
import { IMAGE_ID, MAX_PROJECT_DUTIES, MAX_PROJECT_IMAGES, type Partner, type Stats } from '../src/data/content.js';
import type { Experience } from '../src/data/experience.js';
import { disciplines, kinds, type Project } from '../src/data/projects.js';
import { HEX, ICON_SLUG, MAX_STACK, type StackItem } from '../src/data/stack.js';

const fail = (message: string): never => {
  throw new HTTPException(400, { message });
};

const record = (v: unknown, field: string): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : fail(`${field} must be an object.`);

const list = (v: unknown, field: string, max: number): unknown[] => {
  if (!Array.isArray(v)) return fail(`${field} must be a list.`);
  if (v.length > max) return fail(`${field} can hold at most ${max} items.`);
  return v;
};

function text(v: unknown, field: string, { max = 300, optional = false } = {}): string {
  if (typeof v !== 'string') return fail(`${field} must be text.`);
  const s = v.trim();
  if (!s && !optional) return fail(`${field} is required.`);
  if (s.length > max) return fail(`${field} must be ${max} characters or fewer.`);
  return s;
}

function count(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 9999) {
    return fail(`${field} must be a whole number from 0 to 9999.`);
  }
  return v;
}

function oneOf<T extends string>(v: unknown, field: string, options: readonly T[]): T {
  return options.includes(v as T) ? (v as T) : fail(`${field} must be one of: ${options.join(', ')}.`);
}

/** Accepts "example.com" or a full http(s) address and stores the full address. */
function webAddress(v: unknown, field: string): string | null {
  if (v === null || v === undefined) return null;
  const s = text(v, field, { max: 300, optional: true });
  if (!s) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`);
  } catch {
    return fail(`${field} must be a web address, like example.com.`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) {
    return fail(`${field} must be a web address, like example.com.`);
  }
  return url.href;
}

export function parseStats(body: unknown): Stats {
  const o = record(body, 'Stats');
  return {
    projectsDelivered: count(o.projectsDelivered, 'Projects delivered'),
    coreFrameworks: count(o.coreFrameworks, 'Core frameworks'),
  };
}

export function parsePartners(body: unknown): Partner[] {
  const items = list(record(body, 'Body').partners, 'Worked with', 50);
  return items.map((raw, i) => {
    const o = record(raw, `Worked with #${i + 1}`);
    const logo = o.logo ?? null;
    if (logo !== null && (typeof logo !== 'string' || !IMAGE_ID.test(logo))) fail(`Worked with #${i + 1} has an invalid logo.`);
    return { name: text(o.name, `Worked with #${i + 1} name`, { max: 80 }), logo: logo as string | null };
  });
}

const disciplineNames = disciplines.map((d) => d.name);

function duties(v: unknown, field: string): string[] {
  const lines = list(v ?? [], field, 100)
    .map((d, k) => text(d, `${field} line ${k + 1}`, { max: 300, optional: true }))
    .filter(Boolean);
  if (lines.length > MAX_PROJECT_DUTIES) fail(`${field} can hold at most ${MAX_PROJECT_DUTIES} lines.`);
  return lines;
}

function stackList(v: unknown, field: string): StackItem[] {
  const items = list(v, field, MAX_STACK);
  if (items.length === 0) return fail(`${field} needs at least one technology.`);
  const seen = new Set<string>();
  return items.map((raw, k) => {
    const o = record(raw, `${field} #${k + 1}`);
    const name = text(o.name, `${field} #${k + 1} name`, { max: 60 });
    const icon = o.icon ?? null;
    const hex = o.hex ?? null;
    if (icon !== null && (typeof icon !== 'string' || !ICON_SLUG.test(icon))) fail(`${field} #${k + 1} has an invalid icon.`);
    if (hex !== null && (typeof hex !== 'string' || !HEX.test(hex))) fail(`${field} #${k + 1} has an invalid colour.`);
    if ((icon === null) !== (hex === null)) fail(`${field} #${k + 1} needs both an icon and a colour, or neither.`);
    const keyName = name.toLowerCase();
    if (seen.has(keyName)) fail(`${field} lists ${name} twice.`);
    seen.add(keyName);
    return { name, icon: icon as string | null, hex: hex as string | null };
  });
}

export function parseProjects(body: unknown): Project[] {
  const items = list(record(body, 'Body').projects, 'Projects', 100);
  return items.map((raw, i) => {
    const o = record(raw, `Project #${i + 1}`);
    const at = (f: string) => `Project #${i + 1} ${f}`;
    const images = list(o.images ?? [], at('images'), MAX_PROJECT_IMAGES);
    if (images.some((id) => typeof id !== 'string' || !IMAGE_ID.test(id))) fail(`${at('images')} has an invalid image.`);
    return {
      name: text(o.name, at('name'), { max: 80 }),
      discipline: oneOf(o.discipline, at('discipline'), disciplineNames),
      file: text(o.file, at('file'), { max: 80 }),
      kind: oneOf(o.kind, at('engagement'), kinds),
      client: text(o.client, at('client'), { max: 120 }),
      headline: text(o.headline, at('headline'), { max: 160 }),
      project: text(o.project, at('project'), { max: 160 }),
      desc: text(o.desc, at('description'), { max: 1000 }),
      type: text(o.type, at('type'), { max: 80 }),
      stack: stackList(o.stack, at('stack')),
      role: text(o.role, at('role'), { max: 80 }),
      images: [...new Set(images as string[])],
      duties: duties(o.duties, at('job description')),
      url: webAddress(o.url, at('domain')),
    };
  });
}

export function parseExperience(body: unknown): Experience[] {
  const items = list(record(body, 'Body').experience, 'Experience', 50);
  return items.map((raw, i) => {
    const o = record(raw, `Experience #${i + 1}`);
    const at = (f: string) => `Experience #${i + 1} ${f}`;
    return {
      period: text(o.period, at('period'), { max: 60 }),
      place: text(o.place, at('place'), { max: 60, optional: true }),
      title: text(o.title, at('title'), { max: 120 }),
      org: text(o.org, at('organisation'), { max: 160 }),
      current: typeof o.current === 'boolean' ? o.current : fail(`${at('current')} must be true or false.`),
    };
  });
}
