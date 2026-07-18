const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");

test("Google OAuth sign-in is handled by the Auth.js catch-all route", () => {
  assert.equal(fs.existsSync("app/api/auth/[...nextauth]/route.ts"), true);
  assert.equal(fs.existsSync("app/api/auth/signin/google/route.ts"), false);
});
