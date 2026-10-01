import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeSiteSessionToken,
  timingSafeEqualStr,
} from "@/lib/site-session";

test("timingSafeEqualStr: equal / different / different length", () => {
  assert.equal(timingSafeEqualStr("abc", "abc"), true);
  assert.equal(timingSafeEqualStr("abc", "abd"), false);
  assert.equal(timingSafeEqualStr("abc", "abcd"), false);
  assert.equal(timingSafeEqualStr("", "a"), false);
  assert.equal(timingSafeEqualStr("", ""), true);
});

test("session token is deterministic per password and differs between passwords", async () => {
  const a1 = await computeSiteSessionToken("pw-one");
  const a2 = await computeSiteSessionToken("pw-one");
  const b = await computeSiteSessionToken("pw-two");
  assert.equal(a1, a2);
  assert.notEqual(a1, b);
  assert.match(a1, /^[0-9a-f]{64}$/);
});
