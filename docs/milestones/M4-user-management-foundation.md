# M4: User Management Foundation

## Goal

Add ownership and authentication so frontend users can safely manage their own portfolios.

## Scope

- user model
- password-based auth
- portfolio ownership
- protected routes for portfolio access

## Data Model

### `users`

- `id`
- `name`
- `email`
- `password_hash`
- `created_at`
- `updated_at`

### portfolio ownership

Add to `portfolios`:

- `user_id`

## API Additions

### `POST /api/v1/auth/register`

- create user

### `POST /api/v1/auth/login`

- return access token

### `GET /api/v1/me`

- return current user profile

## Protected Behavior

- portfolio create/upload belongs to authenticated user
- portfolio read/analyze/latest/summary/holdings only accessible to owner

## Implementation Choices

- use JWT access tokens
- hash passwords with bcrypt
- add auth middleware and current-user context

## Acceptance Criteria

- user can register and login
- created portfolio is linked to the logged-in user
- another user cannot access someone else’s portfolio endpoints

## Tests

- register/login happy path
- invalid login rejected
- protected route without token rejected
- cross-user portfolio access rejected with 403

## Not In Scope

- OAuth
- refresh tokens
- roles/admin
- password reset
