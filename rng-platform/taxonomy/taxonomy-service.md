# Taxonomy service (plan)

Simple, fast taxonomy CRUD on top of `AbstractClientFirestoreRepository`. Aligns with `ITaxonomyService` from rng-platform/taxonomy.

## Design

- **Collection**: single Firestore collection (default `taxonomies`).
- **Document ID**: deterministic from `name` via slug (e.g. `"Job Type"` → `job-type`). Enables O(1) lookup by name with `getById(slug(name))` and no extra indexes.
- **No history**: history/undo-redo disabled for taxonomies to keep the path simple and fast.
- **List**: single query with `orderBy('name')` and a reasonable limit; dataset is expected to be small.

## Contract (ITaxonomyService)

| Method | Behavior |
|--------|----------|
| `internalOnly_initiateTaxonomy(name)` | Idempotent: get by slug(name); if exists return it, else create `{ name, values: [] }` with id = slug(name). |
| `getTaxonomyByName(name)` | `getById(slug(name))`. |
| `getTaxonomyById(id)` | `getById(id)`. |
| `updateTaxonomyValues(id, values?)` | `update(id, { values: values ?? [] })`. |
| `deleteTaxonomy(id)` | `delete(id)`. |
| `listTaxonomies()` | `find({ orderBy: [['name','asc']], limit })`; return `items`. |

## Implementation

- **ClientTaxonomyService**: class that owns an `AbstractClientFirestoreRepository<Taxonomy>` configured with:
  - `collectionName: 'taxonomies'`
  - `idStrategy: 'deterministic'`
  - `idGenerator: (data) => slug(data.name)`
  - `enableHistory: false`
  - `softDelete: false` (or true if you want soft-delete for taxonomies; contract says `deleteTaxonomy` so hard delete is fine)
- **Slug**: minimal inline slug (lowercase, spaces/slashes → hyphen, strip non-alphanumeric) so the repo stays dependency-light.
- **Types**: `Taxonomy` (extends BaseEntity, `name: string`, `values: string[]`) and `ITaxonomyService` live in repo so the package is self-contained; rng-platform can re-export or depend on repo.

## Performance

- **getTaxonomyByName** / **getTaxonomyById**: one document read.
- **internalOnly_initiateTaxonomy**: one read then zero or one write.
- **updateTaxonomyValues** / **deleteTaxonomy**: one write.
- **listTaxonomies**: one query; optional in-memory cache (TTL) later if needed.

## Versioning

- Repository public API is frozen (v2). Adding `ClientTaxonomyService`, `Taxonomy`, and `ITaxonomyService` to the package entry point is a **v3** change. Until then, consumers can import from the internal path (e.g. `@/rng-repository/taxonomy/ClientTaxonomyService`) if the project allows.
