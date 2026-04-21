import test from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "../src/services/auth.service";
import { hashPassword, signAccessToken } from "../src/utils/auth";
import { AppError } from "../src/errors/appError";
import { authenticateRequest } from "../src/middlewares/auth.middleware";
import { PortfolioService } from "../src/services/portfolio.service";

const createUserRecord = (input: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  get(key: string) {
    const values: Record<string, unknown> = {
      id: input.id,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: input.createdAt ?? new Date("2026-04-20T10:00:00.000Z"),
      updatedAt: input.updatedAt ?? new Date("2026-04-20T10:00:00.000Z"),
    };

    return values[key];
  },
});

test("AuthService register and login succeeds", async () => {
  const service = new AuthService();
  const users = new Map<string, ReturnType<typeof createUserRecord>>();

  (service as unknown as {
    userRepo: {
      findByEmail: (email: string) => Promise<unknown>;
      create: (input: { name: string; email: string; passwordHash: string }) => Promise<unknown>;
    };
  }).userRepo = {
    findByEmail: async (email: string) => users.get(email) ?? null,
    create: async (input) => {
      const user = createUserRecord({
        id: "user-1",
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
      });
      users.set(input.email, user);
      return user;
    },
  };

  const registerResult = await service.register({
    name: "Harsh",
    email: "harsh@example.com",
    password: "password123",
  });
  const loginResult = await service.login({
    email: "harsh@example.com",
    password: "password123",
  });

  assert.equal(registerResult.user.email, "harsh@example.com");
  assert.equal(registerResult.user.name, "Harsh");
  assert.equal(typeof loginResult.accessToken, "string");
  assert.equal(loginResult.user.id, "user-1");
});

test("AuthService rejects invalid login", async () => {
  const service = new AuthService();

  (service as unknown as {
    userRepo: {
      findByEmail: (email: string) => Promise<unknown>;
    };
  }).userRepo = {
    findByEmail: async () =>
      createUserRecord({
        id: "user-1",
        name: "Harsh",
        email: "harsh@example.com",
        passwordHash: await hashPassword("correct-password"),
      }),
  };

  await assert.rejects(
    () =>
      service.login({
        email: "harsh@example.com",
        password: "wrong-password",
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 401);
      return true;
    },
  );
});

test("authenticateRequest rejects requests without token", async () => {
  const req = {
    header() {
      return undefined;
    },
  } as any;

  let nextError: unknown;

  authenticateRequest(req, {} as any, (error?: unknown) => {
    nextError = error;
  });

  assert.ok(nextError instanceof AppError);
  assert.equal(nextError.statusCode, 401);
});

test("authenticateRequest attaches current user for valid token", async () => {
  const token = signAccessToken({
    id: "user-1",
    email: "harsh@example.com",
    name: "Harsh",
  });

  const req = {
    user: undefined,
    header(name: string) {
      if (name === "authorization") {
        return `Bearer ${token}`;
      }

      return undefined;
    },
  } as any;

  let nextError: unknown;

  authenticateRequest(req, {} as any, (error?: unknown) => {
    nextError = error;
  });

  assert.equal(nextError, undefined);
  assert.deepEqual(req.user, {
    id: "user-1",
    email: "harsh@example.com",
    name: "Harsh",
  });
});

test("PortfolioService rejects cross-user portfolio access with 403", async () => {
  const service = new PortfolioService();

  (service as unknown as {
    repo: { findById: (id: string) => Promise<unknown> };
  }).repo = {
    findById: async () => ({
      get(key: string) {
        const values: Record<string, unknown> = {
          id: "portfolio-1",
          userId: "owner-1",
          name: "Owner Portfolio",
          fileName: "owner.xlsx",
          createdAt: new Date("2026-04-20T10:00:00.000Z"),
          updatedAt: new Date("2026-04-20T10:00:00.000Z"),
          items: [],
        };

        return values[key];
      },
    }),
  };

  await assert.rejects(
    () => service.getPortfolioSummary("portfolio-1", "other-user"),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 403);
      return true;
    },
  );
});
