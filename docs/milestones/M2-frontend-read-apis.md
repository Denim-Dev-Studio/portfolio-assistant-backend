# M2: Frontend Read APIs

## Goal

Add UI-friendly read endpoints so a frontend can list portfolios, show summary cards, render holdings tables, and open a holding detail screen without reverse-engineering the raw DB models.

## Scope

- add portfolio listing API
- add portfolio summary API
- add holdings list API
- add holding detail API
- read from persisted latest analysis data from M1

## API Additions

### `GET /api/v1/portfolios`

Returns lightweight portfolio cards:

- `id`
- `name`
- `fileName`
- `createdAt`
- `lastAnalyzedAt`
- `holdingCount`
- `latestSummary`

### `GET /api/v1/portfolio/:id/summary`

Returns:

- portfolio metadata
- latest analysis summary
- latest analysis timestamp

### `GET /api/v1/portfolio/:id/holdings`

Returns holding rows for the latest analysis:

- `symbol`
- `displayName`
- `quantity`
- `avgPrice`
- `currentPrice`
- `action`
- `score`
- `confidence`
- `signals`

Query support:

- `action`
- `minConfidence`
- `hasMissingData`

### `GET /api/v1/portfolio/:id/holdings/:symbol`

Returns one holding detail with:

- portfolio item data
- latest persisted analysis
- reasoning
- signals

## Service Changes

- add latest-analysis lookup helpers
- add read DTOs instead of returning raw Sequelize models directly

## Acceptance Criteria

- frontend can load a portfolio list page with one request
- frontend can load summary and holdings separately
- holdings endpoint can filter by action
- all endpoints use the latest persisted analysis run

## Tests

- list endpoint returns stable card shape
- summary endpoint returns latest persisted run
- holdings endpoint filtering works
- holding detail endpoint returns 404 for unknown symbol in portfolio

## Not In Scope

- pagination beyond basic support if dataset stays small
- auth
- portfolio editing UI flows
