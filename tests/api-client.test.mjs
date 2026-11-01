import assert from "node:assert/strict";
import test from "node:test";
import { MenuApiError, readApiResponse, requestApiJson } from "../lib/api-client.mjs";

test("parses successful JSON without relying on WebKit Response.json", async () => {
  const response = Response.json({ recipes: [] });
  response.json = () => { throw new DOMException("The string did not match the expected pattern.", "SyntaxError"); };
  assert.deepEqual(await readApiResponse(response, "recipes"), { recipes: [] });
});

test("reports a missing recipes endpoint before parsing the old NAS HTML 404 body", async () => {
  const response = new Response("<!doctype html><h1>Not found</h1>", { status: 404, headers: { "Content-Type": "text/html" } });
  await assert.rejects(readApiResponse(response, "recipes"), (error) => {
    assert.ok(error instanceof MenuApiError);
    assert.equal(error.status, 404);
    assert.match(error.message, /群晖缺少菜品库接口/);
    assert.match(error.message, /只更新 App 不会更新服务器/);
    assert.doesNotMatch(error.message, /expected pattern|doctype/);
    return true;
  });
  assert.equal(response.bodyUsed, false);
});

test("distinguishes missing history and access-denied responses", async () => {
  await assert.rejects(readApiResponse(new Response("not found", { status: 404 }), "history"), /找不到历史菜单接口/);
  for (const status of [401, 403]) {
    await assert.rejects(readApiResponse(new Response("login", { status }), "recipes"), /群晖拒绝访问/);
  }
});

test("explains HTML login pages, broken JSON and empty bodies in Chinese", async () => {
  for (const body of ["<!DOCTYPE html><h1>Synology Login</h1>", "{broken", ""]) {
    await assert.rejects(readApiResponse(new Response(body), "recipes"), /请确认网址指向菜单服务/);
  }
});

test("does not expose HTML server errors, but preserves useful JSON validation errors", async () => {
  await assert.rejects(readApiResponse(new Response("<h1>private stack trace</h1>", { status: 502 }), "history"), /HTTP 502/);
  await assert.rejects(readApiResponse(Response.json({ error: "这道菜已经存在，请换一个名称。" }, { status: 409 }), "recipes"), /这道菜已经存在/);
});

test("rejects valid JSON with an invalid top-level envelope", async () => {
  for (const data of [null, [], "hello", 123]) {
    await assert.rejects(readApiResponse(Response.json(data), "recipes"), /格式不正确/);
  }
});

test("translates native and browser transport errors without leaking raw English errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new DOMException("The string did not match the expected pattern.", "SyntaxError"); });
  await assert.rejects(requestApiJson("http://192.168.1.111:3000/api/recipes", "recipes"), /无法连接群晖菜单服务/);
});

test("preserves POST data and headers and never retries a mutation automatically", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls++;
    assert.equal(url, "/api/recipes");
    assert.equal(options.method, "POST");
    assert.equal(options.body, '{"name":"新菜"}');
    assert.equal(options.headers.get("Content-Type"), "application/json");
    assert.equal(options.headers.get("Accept"), "application/json");
    return new Response("<html>old version</html>", { status: 404 });
  });
  await assert.rejects(requestApiJson("/api/recipes", "recipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"name":"新菜"}' }), /群晖缺少菜品库接口/);
  assert.equal(calls, 1);
});
