# M1: Analysis Persistence

## Goal

Persist every portfolio analysis run and every per-holding analysis result so the product has history, latest-result retrieval, and a stable backend contract for the future UI.

## Why First

The current backend computes analysis on demand but does not persist the result. Frontend support will need:

- latest analysis state
- analysis history
- stable summary cards without recomputing every page load

## Scope

- add DB tables for analysis runs and holding analysis results
- persist results whenever `portfolio/:id/analyze` is executed
- expose latest analysis retrieval
- keep the current synchronous analysis flow

## Data Model

Add tables:

### `analysis_runs`

- `id`
- `portfolio_id`
- `status` (`completed`, `partial`, `failed`)
- `generated_at`
- `summary_json`
- `created_at`
- `updated_at`

### `holding_analyses`

- `id`
- `analysis_run_id`
- `portfolio_item_id`
- `symbol`
- `action`
- `score`
- `confidence`
- `reasoning_json`
- `signals_json`
- `created_at`
- `updated_at`

## API Changes

Keep:

- `GET /api/v1/portfolio/:id/analyze`

Change behavior:

- it should still return the analysis response
- it should also persist the run and its holding results

Add:

- `GET /api/v1/portfolio/:id/analysis/latest`

Returns:

- latest persisted analysis run for the portfolio
- summary
- all persisted holding analyses for that run

## Service Changes

- add repository layer for `analysis_runs` and `holding_analyses`
- update `PortfolioAnalysisService` to:
  - compute analysis
  - persist run
  - persist per-holding results
  - return the same response shape as today

## Acceptance Criteria

- running portfolio analysis creates one `analysis_runs` row
- each holding creates one `holding_analyses` row linked to that run
- `latest` endpoint returns the most recent saved run
- existing analyze response remains backward-compatible

## Tests

- migration and model smoke checks
- service test: persisted run count increases after analyze
- service test: holding result count matches number of analyzed holdings
- endpoint test: latest endpoint returns the newest run

## Not In Scope

- background jobs
- queued analysis
- incremental refresh
- user ownership
