# App Blueprint

This file is the high-level blueprint of the backend as it exists today.

Use this as the first reference before reading source files. It is meant to answer:

- what the app does
- how data flows through it
- which modules own which responsibilities
- what APIs already exist
- what milestones are done and what is still pending

## Product Summary

This is an Express + TypeScript backend for Indian equity portfolio analysis.

Current product capabilities:

- ingest a portfolio manually or from uploaded CSV/XLSX
- resolve holdings to NSE symbols using local symbol data
- persist portfolios and portfolio items in Postgres
- analyze each holding using market data providers
- persist every analysis run and every per-holding result
- expose read APIs shaped for frontend screens

It does not serve a frontend application. It serves JSON APIs that a frontend can consume.

## Milestone Status

### M1: Analysis Persistence

Implemented.

What it added:

- `analysis_runs` table
- `holding_analyses` table
- persistence on `GET /api/v1/portfolio/:id/analyze`
- `GET /api/v1/portfolio/:id/analysis/latest`

### M2: Frontend Read APIs

Implemented.

What it added:

- `GET /api/v1/portfolio`
- `GET /api/v1/portfolio/:id/summary`
- `GET /api/v1/portfolio/:id/holdings`
- `GET /api/v1/portfolio/:id/holdings/:symbol`

These endpoints reshape DB and persisted-analysis data into stable UI-facing DTOs.

### M3: Portfolio Insights

Planned, not implemented yet.

Expected direction:

- portfolio totals
- P/L metrics
- portfolio weights
- concentration and quality flags
- top conviction and weakest holdings

## Runtime Shape

Main entrypoints:

- [src/index.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/index.ts): bootstraps DB, symbol loader, and HTTP server
- [src/app.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/app.ts): creates the Express app

Current startup flow:

1. initialize models
2. connect to Postgres
3. load NSE symbol mapping from `EQUITY_L.csv`
4. start Express server

## Layered Architecture

### Routes

Route definitions live in `src/routes/`.

Important files:

- [src/routes/index.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/routes/index.ts)
- [src/routes/portfolio.routes.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/routes/portfolio.routes.ts)
- [src/routes/portfolioAnalysis.routes.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/routes/portfolioAnalysis.routes.ts)

Route layer responsibility:

- URL mapping
- Swagger annotations
- mounting controller handlers

### Controllers

Controller files live in `src/controllers/`.

Important files:

- [src/controllers/portfolio.controller.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/controllers/portfolio.controller.ts)
- [src/controllers/portfolioAnalysis.controller.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/controllers/portfolioAnalysis.controller.ts)

Controller responsibility:

- extract path/query params
- basic request validation
- call service methods
- return JSON responses

Controllers should stay thin. Business logic belongs in services.

### Services

Service files live in `src/services/`.

Important files:

- [src/services/portfolio.service.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/services/portfolio.service.ts)
- [src/services/portfolioAnalysis.service.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/services/portfolioAnalysis.service.ts)
- [src/services/dataAggregator.service.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/services/dataAggregator.service.ts)
- [src/services/analysisEngine.service.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/services/analysisEngine.service.ts)

Service responsibility:

- ingestion validation and symbol enrichment
- frontend read DTO shaping
- latest-analysis lookup
- holding filtering
- analysis orchestration
- provider aggregation
- score/action/confidence calculation

### Repositories

Repository files live in `src/repositories/`.

Important files:

- [src/repositories/portfolio.repository.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/repositories/portfolio.repository.ts)
- [src/repositories/analysis.repository.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/repositories/analysis.repository.ts)

Repository responsibility:

- Sequelize queries
- model includes and ordering
- persistence/retrieval of portfolio and analysis data

### Models

Model files live in `src/models/`.

Core models:

- `Portfolio`
- `PortfolioItem`
- `AnalysisRun`
- `HoldingAnalysis`
- `CacheEntry`

Associations are initialized in [src/models/index.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/models/index.ts).

### Providers and Adapters

Provider files live in `src/providers/`.

Used providers:

- NSE symbol resolution: `nseSymbol.provider.ts`
- fundamentals: `yahoo.provider.ts` and related provider wiring
- price history: `nseHistory.provider.ts`
- technical indicators: `technical.provider.ts`
- news/sentiment: `marketaux.provider.ts`, `sentiment.provider.ts`

Adapter files live in `src/adapters/`.

Current adapter:

- [src/adapters/broker.parser.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/adapters/broker.parser.ts)

Its job is to normalize uploaded broker files into internal holding rows.

## Core Domain Objects

### Portfolio

Represents a named user portfolio.

Key fields:

- `id`
- `name`
- `fileName`
- timestamps

### PortfolioItem

Represents one holding in a portfolio.

Key fields:

- `portfolioId`
- `symbol`
- `displayName`
- `isin`
- `quantity`
- `avgPrice`
- `currentPrice`

### AnalysisRun

Represents one persisted analysis execution for a portfolio.

Key fields:

- `portfolioId`
- `status`
- `generatedAt`
- `summaryJson`

### HoldingAnalysis

Represents the persisted analysis output for one holding within an analysis run.

Key fields:

- `analysisRunId`
- `portfolioItemId`
- `symbol`
- `action`
- `score`
- `confidence`
- `reasoningJson`
- `signalsJson`

## Main Request Flows

### 1. Portfolio Creation

Manual creation path:

- `POST /api/v1/portfolio`
- controller calls `PortfolioService.createPortfolio`
- service validates input
- repository writes `Portfolio` and nested `PortfolioItem[]`

Upload path:

- `POST /api/v1/portfolio/upload`
- file goes through Multer middleware
- `PortfolioService.createPortfolioFromFile`
- broker parser reads CSV/XLSX
- ISIN gets resolved to NSE symbol
- invalid/unresolved rows are skipped
- normalized rows are persisted as portfolio items

### 2. Portfolio Analysis

Path:

- `GET /api/v1/portfolio/:id/analyze`

Flow:

1. load portfolio with items
2. fetch aggregated data per symbol
3. compute action, score, confidence, reasoning, and signals
4. build portfolio summary
5. persist `AnalysisRun`
6. persist `HoldingAnalysis[]`
7. return analysis response

Main logic lives in [src/services/portfolioAnalysis.service.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/services/portfolioAnalysis.service.ts).

### 3. Frontend Read APIs

These APIs do not compute fresh analysis. They read persisted latest-analysis data.

Current endpoints:

- `GET /api/v1/portfolio`
- `GET /api/v1/portfolio/:id/summary`
- `GET /api/v1/portfolio/:id/holdings`
- `GET /api/v1/portfolio/:id/holdings/:symbol`
- `GET /api/v1/portfolio/:id/analysis/latest`

Read-path logic lives mainly in [src/services/portfolio.service.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/services/portfolio.service.ts).

## Current API Surface

### Health

- `GET /api/v1/ping`

### Portfolio Write APIs

- `POST /api/v1/portfolio`
- `POST /api/v1/portfolio/upload`

### Portfolio Raw Read APIs

- `GET /api/v1/portfolio/:id`
- `GET /api/v1/portfolio/:id/analysis/latest`

### Portfolio Analysis API

- `GET /api/v1/portfolio/:id/analyze`

This computes and persists a new run.

### Frontend-Oriented Read APIs

- `GET /api/v1/portfolio`
  Returns portfolio cards for a list screen.

- `GET /api/v1/portfolio/:id/summary`
  Returns portfolio metadata plus latest persisted analysis summary.

- `GET /api/v1/portfolio/:id/holdings`
  Returns holding rows for the latest persisted run.

  Supported query params:

  - `action`
  - `minConfidence`
  - `hasMissingData`

- `GET /api/v1/portfolio/:id/holdings/:symbol`
  Returns one holding detail from the latest persisted run.

## DTOs and Response Shapes

Frontend-specific DTOs live in [src/types/frontendRead.types.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/types/frontendRead.types.ts).

Important DTOs:

- `PortfolioCardDto`
- `PortfolioSummaryDto`
- `HoldingRowDto`
- `HoldingDetailDto`

Persisted analysis types live in [src/types/analysis.types.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/types/analysis.types.ts).

Important persisted read type:

- `LatestAnalysisSnapshot`

Design rule:

- raw Sequelize models are acceptable for some older endpoints
- frontend-oriented endpoints should return explicit DTOs instead of raw models

## Analysis Logic Summary

The scoring engine is deterministic and rule-based.

Possible actions:

- `BUY_MORE`
- `HOLD`
- `WATCH`
- `SELL`

Signals tracked per holding:

- `fundamental`
- `priceHistory`
- `technical`
- `news`

Signal status values:

- `available`
- `unsupported_symbol`
- `no_data`
- `provider_error`
- `auth_error`
- `insufficient_history`

Current behavior:

- analysis still completes even when some providers fail
- failures reduce confidence
- reasoning explains missing or degraded data
- run-level status becomes `completed`, `partial`, or `failed`

## Caching

There is a two-layer cache:

- in-memory cache for fast short-lived reuse
- persistent Postgres-backed cache for cross-request reuse

Cache storage model:

- `CacheEntry`

Cache is symbol-based, not portfolio-based.

Implication:

- repeated analysis of the same symbol may reuse cached provider data
- analysis results themselves are still persisted separately by run

## Error Handling

Important files:

- [src/errors/appError.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/errors/appError.ts)
- [src/middlewares/error.middleware.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/middlewares/error.middleware.ts)

Pattern:

- services and repositories throw `AppError`
- error middleware normalizes framework/database errors
- API responses return a structured error envelope

## Testing

Current tests live in `tests/`.

Notable files:

- [tests/analysisEngine.test.ts](/Users/Harsh/workspace/portfolio-assistant-backend/tests/analysisEngine.test.ts)
- [tests/technicalProvider.test.ts](/Users/Harsh/workspace/portfolio-assistant-backend/tests/technicalProvider.test.ts)
- [tests/frontendReadApis.test.ts](/Users/Harsh/workspace/portfolio-assistant-backend/tests/frontendReadApis.test.ts)

Current test approach:

- `node:test`
- `ts-node/register`
- focused unit and handler/service tests

## Current Limitations

- no auth or user ownership model
- no background job or queue for analysis
- no pagination on portfolio list/read APIs
- no portfolio insights API yet
- some legacy endpoints still return raw Sequelize-shaped responses
- frontend read APIs depend on a previously persisted analysis run

## Suggested Reading Order

When you need to understand or change behavior, start in this order:

1. this file
2. milestone doc for the feature area under `docs/milestones/`
3. route file for the endpoint
4. controller file
5. service file
6. repository/model/provider code only if needed

## If You Need To Add M3 Next

Most likely touchpoints:

- [src/types/frontendRead.types.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/types/frontendRead.types.ts)
- [src/services/portfolio.service.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/services/portfolio.service.ts)
- [src/routes/portfolio.routes.ts](/Users/Harsh/workspace/portfolio-assistant-backend/src/routes/portfolio.routes.ts)
- tests for weighted totals and ranking stability

Likely implementation strategy:

1. enrich holding rows with value and P/L metrics
2. extend summary DTO with portfolio-level totals
3. add `/portfolio/:id/insights`
4. keep using latest persisted analysis as the source of truth
