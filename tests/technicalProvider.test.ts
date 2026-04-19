import test from "node:test";
import assert from "node:assert/strict";
import { getTechnicalAnalysis } from "../src/providers/technical.provider";

test("getTechnicalAnalysis reports insufficient history for short series", async () => {
  const result = await getTechnicalAnalysis([100, 101, 102, 103, 104, 105, 106, 107, 108, 109]);

  assert.equal(result.data, null);
  assert.equal(result.signal.status, "insufficient_history");
  assert.match(result.signal.message, /at least 14/i);
});
