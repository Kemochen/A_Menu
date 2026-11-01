import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeServerUrl } from "../mobile/server-url.mjs";

test("normalizes HTTPS server origins including a custom port", () => {
  assert.equal(normalizeServerUrl("  https://MENU.example.com/  "), "https://menu.example.com");
  assert.equal(normalizeServerUrl("https://nas.example.com:8443"), "https://nas.example.com:8443");
});

test("accepts LAN and VPN HTTP addresses with ports", () => {
  for (const value of [
    "http://192.168.1.111:3000", "http://10.0.0.1:3000",
    "http://172.16.0.1:3000", "http://172.31.255.254:3000",
    "http://100.64.0.1:3000", "http://100.127.255.254:3000",
    "http://[fd00::1]:3000", "http://[fc00::1]:3000", "http://[fe80::1]:3000",
    "http://nas.local:3000", "http://ckm-nas:3000"
  ]) {
    assert.equal(normalizeServerUrl(value), value);
  }
  assert.equal(normalizeServerUrl("  HTTP://NAS.LOCAL:3000/  "), "http://nas.local:3000");
  assert.equal(normalizeServerUrl("http://0xc0a8016f:3000"), "http://192.168.1.111:3000");
});

test("rejects public HTTP, loopback, credentials, unsupported schemes and ambiguous URLs", () => {
  for (const value of [
    "", "menu.example.com", "http://menu.example.com", "http://8.8.8.8:3000",
    "http://172.15.255.255", "http://172.32.0.1", "http://192.169.0.1",
    "http://100.63.255.255", "http://100.128.0.1", "http://[2001:db8::1]",
    "http://[fec0::1]", "http://localhost:3000", "https://localhost",
    "http://127.0.0.1:3000", "http://2130706433", "http://[::1]",
    "http://nas.local.evil.com", "http://192.168.1.111.evil.com",
    "javascript:alert(1)", "https://user:password@menu.example.com",
    "ftp://192.168.1.111", "http://user:password@192.168.1.111:3000",
    "http://192.168.1.111:3000/api/history", "http://192.168.1.111:3000?key=secret",
    "https://menu.example.com/api/history", "https://menu.example.com?key=secret",
    "https://menu.example.com#section"
  ]) {
    assert.throws(() => normalizeServerUrl(value), undefined, value);
  }
});

test("iOS transport policy permits only private address ranges without global ATS bypass", () => {
  const policy = JSON.parse(readFileSync(new URL("../mobile/ios-network-policy.json", import.meta.url), "utf8"));
  const transport = policy.NSAppTransportSecurity;
  assert.equal(transport.NSAllowsLocalNetworking, true);
  assert.equal(transport.NSAllowsArbitraryLoads, undefined);
  assert.equal(transport.NSAllowsArbitraryLoadsInWebContent, undefined);
  assert.deepEqual(Object.keys(transport.NSExceptionDomains).sort(), [
    "10.0.0.0/8", "100.64.0.0/10", "172.16.0.0/12", "192.168.0.0/16", "fc00::/7", "fe80::/10"
  ].sort());
  for (const exception of Object.values(transport.NSExceptionDomains)) {
    assert.deepEqual(exception, { NSExceptionAllowsInsecureHTTPLoads: true });
  }
  const prepare = readFileSync(new URL("../scripts/prepare-ios.mjs", import.meta.url), "utf8");
  assert.ok(prepare.includes("mobile/ios-network-policy.json"));
  assert.ok(prepare.includes("Merge ${policyFile}"));
});

test("packages local assets with native HTTP instead of loading a remote website", () => {
  const config = JSON.parse(readFileSync(new URL("../capacitor.config.json", import.meta.url), "utf8"));
  assert.equal(config.webDir, "mobile/dist");
  assert.equal(config.plugins.CapacitorHttp.enabled, true);
  assert.equal(config.server, undefined);
});
