import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeServerUrl } from "../mobile/server-url.mjs";

test("normalizes HTTPS server origins including a custom port", () => {
  assert.equal(normalizeServerUrl("  https://MENU.example.com/  "), "https://menu.example.com");
  assert.equal(normalizeServerUrl("https://nas.example.com:8443"), "https://nas.example.com:8443");
});

test("rejects insecure, credential-bearing, or ambiguous server URLs", () => {
  for (const value of [
    "", "menu.example.com", "http://192.168.1.111:3000",
    "javascript:alert(1)", "https://user:password@menu.example.com",
    "https://menu.example.com/api/history", "https://menu.example.com?key=secret",
    "https://menu.example.com#section"
  ]) {
    assert.throws(() => normalizeServerUrl(value), undefined, value);
  }
});

test("packages local assets with native HTTP instead of loading a remote website", () => {
  const config = JSON.parse(readFileSync(new URL("../capacitor.config.json", import.meta.url), "utf8"));
  assert.equal(config.webDir, "mobile/dist");
  assert.equal(config.plugins.CapacitorHttp.enabled, true);
  assert.equal(config.server, undefined);
});
