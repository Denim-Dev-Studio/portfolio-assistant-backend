# M5: API Access Hardening

## Goal

Move the API from route-by-route protection to an explicit public/private access policy so every non-public endpoint is authenticated by default.

## Why This Exists

M4 adds authentication and ownership for portfolio APIs, but it does not mean literally every endpoint in the app requires authentication.

Some endpoints should stay public by design:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/ping`
- optionally `/api-docs` depending on deployment policy

This milestone is for making the access model explicit and hard to misconfigure.

## Scope

- define an allowlist of public routes
- apply auth middleware by default to every API route outside that allowlist
- make Swagger reflect public vs protected routes consistently
- add tests that fail when a new private route is mounted without auth
- decide whether `/api-docs` should be public or protected in each environment

## API Behavior

Public endpoints:

- health check
- register
- login

Protected endpoints:

- `/api/v1/me`
- all portfolio endpoints
- any future business endpoints unless explicitly allowlisted

## Acceptance Criteria

- every business/data endpoint is authenticated by default
- public endpoints are intentional and documented
- Swagger security requirements match runtime behavior
- adding a new private route without auth is caught by tests

## Tests

- public route allowlist behaves as documented
- protected routes reject unauthenticated requests
- route policy test covers future namespaces

## Not In Scope

- OAuth
- RBAC
- refresh tokens
