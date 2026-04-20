# M3: Portfolio Insights

## Goal

Turn the backend from “holding analyzer” into a fuller portfolio product by adding derived portfolio-level insights and metrics.

## Scope

- compute position-level and portfolio-level metrics
- return stronger summary and portfolio health signals
- support UI sections like overview, risks, and top ideas

## Metrics To Add

Per holding:

- invested value
- current value
- unrealized P/L
- unrealized P/L %
- portfolio weight

Portfolio level:

- total invested value
- total current value
- total unrealized P/L
- total unrealized P/L %
- action distribution
- confidence distribution
- missing-data count
- top conviction holdings
- weakest holdings

## API Changes

Extend:

- `GET /api/v1/portfolio/:id/summary`

Add:

- `GET /api/v1/portfolio/:id/insights`

Returns:

- overview metrics
- concentration flags
- highest-conviction holdings
- lowest-scoring holdings
- data-quality flags

## Acceptance Criteria

- every latest holding row exposes value and P/L fields
- summary endpoint includes portfolio-level totals
- insights endpoint identifies top and weak holdings deterministically

## Tests

- weighted totals are correct for a known portfolio fixture
- P/L calculations match quantity and price inputs
- top/weak holding ranking is stable

## Not In Scope

- sector allocation
- benchmark comparison
- alerts
- rebalancing recommendations
