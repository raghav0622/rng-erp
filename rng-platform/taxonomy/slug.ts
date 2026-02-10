/**
 * Minimal slug for taxonomy document IDs: lowercase, spaces/slashes → hyphen, strip non-alphanumeric.
 * Keeps rng-repository dependency-free.
 */
export function slug(name: string | null | undefined): string {
  if (name == null || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
