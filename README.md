# Portfolio Assistant Backend

Backend service for uploading Indian equity portfolios, resolving holdings to NSE symbols, storing them in Postgres, and generating deterministic per-holding portfolio analysis.

## What It Does

The app supports two main workflows:

1. Portfolio ingestion
   - Accepts a CSV or XLSX holdings file
   - Parses broker-style rows
   - Resolves NSE symbols from ISIN using `EQUITY_L.csv`
   - Stores the portfolio and its items in Postgres

2. Portfolio analysis
   - Loads an existing portfolio from the database
   - Fetches market data per holding
   - Computes fundamentals, technicals, and news sentiment
   - Returns an action, score, confidence, reasoning, and signal status for each stock

## Current Data Sources

- Symbol resolution: local `EQUITY_L.csv`
- Fundamentals: `yahoo-finance2`
- Historical prices: `stock-nse-india`
- Technical indicators: computed locally with `talib`
- News: `MarketAux`
- Sentiment: computed locally with `sentiment`

## Current Analysis Model

Each holding is scored from four possible outcomes:

- `BUY_MORE`
- `HOLD`
- `WATCH`
- `SELL`

The score is driven by:

- Fundamentals
  - `peRatio`
  - `roe`
  - `debtToEquity`
- Technicals
  - `rsi`
  - `sma50`
  - `sma200`
- News sentiment

If one source is unavailable, the app still analyzes the holding with the remaining signals and explains what was missing in the `reasoning` and `signals` fields.

## Scoring Logic

The scoring engine starts every holding at a neutral base score of `50`.

It then adjusts the score using:

- fundamentals
  - lower `P/E` is generally better
  - higher `ROE` is better
  - lower `debtToEquity` is better
- technicals
  - `RSI` rewards healthy momentum and penalizes overheated conditions
  - trend uses `currentPrice`, `SMA50`, and `SMA200`
- news sentiment
  - positive average sentiment adds points
  - negative sentiment subtracts points

The final score is clamped to `0-100` and mapped to an action:

- `75+` → `BUY_MORE`
- `55-74` → `HOLD`
- `35-54` → `WATCH`
- `<35` → `SELL`

Confidence depends on:

- how many signal groups were actually available
- how far the final score is from the neutral midpoint

If fundamentals or technicals are missing, the app still returns a result, but confidence is reduced and the reason is explained in the response.

## API Base Paths

- API: `/api/v1`
- Swagger UI: `/api-docs`

## Endpoints

### Health Check

`GET /api/v1/ping`

Returns a simple server status response.

### Create Portfolio Manually

`POST /api/v1/portfolio`

Request body:

```json
{
  "name": "My Portfolio",
  "items": [
    {
      "symbol": "RELIANCE.NS",
      "displayName": "Reliance Industries",
      "isin": "INE002A01018",
      "quantity": 10,
      "avgPrice": 2400,
      "currentPrice": 2500
    }
  ]
}
```

### Upload Portfolio File

`POST /api/v1/portfolio/upload`

Multipart form fields:

- `file`: CSV or XLSX file
- `name`: portfolio name

What happens:

1. File is parsed into normalized rows
2. ISIN is used to resolve NSE symbol
3. Invalid rows or unresolved symbols are skipped
4. Valid rows are stored in `portfolios` and `portfolio_items`

### Get Portfolio

`GET /api/v1/portfolio/:id`

Returns the stored portfolio and its items.

### Analyze Portfolio

`GET /api/v1/portfolio/:id/analyze`

Returns portfolio-level summary and per-holding analysis.

Example response shape:

```json
{
  "success": true,
  "data": {
    "portfolioId": "uuid",
    "portfolioName": "My Portfolio",
    "generatedAt": "2026-04-20T12:00:00.000Z",
    "summary": {
      "totalHoldings": 10,
      "fullyAnalyzed": 6,
      "partiallyAnalyzed": 3,
      "failed": 1
    },
    "items": [
      {
        "symbol": "RELIANCE.NS",
        "action": "HOLD",
        "score": 64,
        "confidence": 47,
        "reasoning": [
          "P/E 24.2 is still within a reasonable range.",
          "ROE 15.8 supports durable business quality.",
          "Debt/equity 0.42 is comfortably manageable."
        ],
        "signals": {
          "fundamental": {
            "provider": "yahoo-finance2",
            "status": "available",
            "message": "Fundamental data loaded from Yahoo Finance for RELIANCE.NS."
          },
          "priceHistory": {
            "provider": "stock-nse-india",
            "status": "available",
            "message": "Loaded 220 daily price bars from NSE history for RELIANCE.NS."
          },
          "technical": {
            "provider": "derived",
            "status": "available",
            "message": "Technical indicators were computed from 220 daily bars."
          },
          "news": {
            "provider": "marketaux",
            "status": "available",
            "message": "Loaded 3 related news articles for RELIANCE.NS."
          }
        }
      }
    ]
  }
}
```

## Signal Status Meaning

Every analyzed holding includes machine-readable signal status for:

- `fundamental`
- `priceHistory`
- `technical`
- `news`

Possible status values:

- `available`
- `unsupported_symbol`
- `no_data`
- `provider_error`
- `auth_error`
- `insufficient_history`

This is the primary debugging surface when a holding does not get full analysis.

## Caching

The app uses a two-layer cache:

1. In-memory cache
   - Fast
   - Lost when the server restarts

2. Persistent Postgres cache
   - Survives restarts
   - Shared across requests while entries are valid

The cache is symbol-based, not portfolio-based.

That means:

- analyzing the same portfolio twice reuses symbol data
- two portfolios holding the same symbol also reuse the same cached market data
- the final analysis response itself is not cached by `portfolioId`

### Current Cache TTL

Successful provider data is cached for 7 days:

- Yahoo fundamentals
- NSE historical prices
- MarketAux news

Short-lived failure responses are cached for 15 minutes to avoid hammering external services during provider issues.

### Persistent Cache Table

Persistent cache entries are stored in:

- `cache_entries`

Fields:

- `key`
- `value`
- `expires_at`

If this table is missing, the app falls back to memory-only caching and logs a warning.

## Database Tables

### `portfolios`

- `id`
- `name`
- `file_name`
- `created_at`
- `updated_at`

### `portfolio_items`

- `id`
- `portfolio_id`
- `symbol`
- `display_name`
- `isin`
- `quantity`
- `avg_price`
- `current_price`
- `created_at`
- `updated_at`

### `cache_entries`

- `key`
- `value`
- `expires_at`
- `created_at`
- `updated_at`

## Environment Variables

Create a `.env` file with at least:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=portfolio_db
DB_USER=postgres
DB_PASSWORD=postgres

MARKETAUX_API_KEY=your_marketaux_api_key
```

Notes:

- Yahoo Finance does not require an API key in the current implementation.
- `EQUITY_L.csv` must exist at the project root because it is used to resolve ISIN to NSE symbols.

## Install and Run

Install dependencies:

```bash
npm install
```

Run the server in development mode:

```bash
npm run dev
```

The app will:

1. connect to Postgres
2. initialize Sequelize models
3. load symbol mappings from `EQUITY_L.csv`
4. start the Express server

## Migrations

Make sure your database schema includes:

- portfolios
- portfolio_items
- cache_entries

If you are using Sequelize migrations, run your migration workflow before starting the app.

At minimum, the cache migration added in this project must be applied:

- [migrations/20260420153000-create-cache-entries.js](/Users/Harsh/workspace/portfolio-assistant-backend/migrations/20260420153000-create-cache-entries.js)

## How Upload Parsing Works

The upload parser supports CSV and XLSX.

Expected normalized fields per row:

- `displayName`
- `isin`
- `quantity`
- `avgPrice`
- `currentPrice`

The parser does not require a symbol in the uploaded file. Symbol resolution happens afterward through ISIN lookup.

## Important Runtime Notes

- Symbols are stored in DB as exchange-qualified NSE tickers such as `RELIANCE.NS`
- Technical indicators depend on valid historical prices
- Fundamentals depend on Yahoo response availability for the symbol
- News can be absent for smaller or less-covered stocks
- A holding can still return a result even when one or more signals are missing

## Testing

Run the current tests:

```bash
npm test
```

Run a TypeScript compile check:

```bash
npx tsc --noEmit
```

## Current Limitations

- Yahoo Finance is unofficial and can change response shape without notice
- Some NSE symbols may have incomplete fundamentals or no provider coverage
- News coverage is uneven for smaller-cap names
- Technical indicators are derived only from fetched historical prices; if NSE history is empty, technicals cannot be computed
- Final portfolio analysis is not cached as a single portfolio response

## Recommended Usage Flow

1. Start Postgres
2. Apply migrations
3. Set `.env`
4. Start the server
5. Upload a portfolio file
6. Copy the returned portfolio `id`
7. Call `GET /api/v1/portfolio/:id/analyze`
8. Inspect `summary`, `reasoning`, and `signals`
