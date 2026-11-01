import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { createRecipeStore } from "../lib/recipe-store.mjs";
import { normalizeRecipeInput } from "../lib/recipe-input.mjs";

const input = (name = "测试新菜") => ({ name, category: "家常菜", tags: ["清淡", "清淡"], weather: "both", ingredients: ["番茄", "牛肉", "番茄"], ingredientTypes: { "番茄": "蔬菜", "牛肉": "肉类" } });
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "a-menu-recipes-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "recipes.json");
  return { directory, file, store: createRecipeStore(file) };
}

test("normalizes tags, ingredients, category and fallback image", () => {
  const normalized = normalizeRecipeInput({ ...input(), category: "面类/主食类" });
  assert.equal(normalized.category, "主食类");
  assert.equal(normalized.image, "/dishes/categories/staple.svg");
  assert.deepEqual(normalized.tags, ["清淡"]);
  assert.deepEqual(normalized.ingredients, ["番茄", "牛肉"]);
  assert.deepEqual(normalized.ingredientTypes, { "番茄": "蔬菜", "牛肉": "肉类" });
});

test("rejects blank and oversized fields, invalid weather, ingredients and unsafe images", () => {
  for (const fields of [{ name: " " }, { name: "a".repeat(61) }, { category: "" }, { weather: "rain" }, { tags: ["a".repeat(21)] }, { ingredients: [] }, { ingredients: [""] }, { ingredientTypes: {} }, { image: "javascript:alert(1)" }, { image: "data:image/png;base64,abc" }, { image: "https://user:password@example.com/image.jpg" }]) {
    assert.throws(() => normalizeRecipeInput({ ...input(), ...fields }));
  }
  assert.equal(normalizeRecipeInput({ ...input(), image: "https://example.com/dish.jpg" }).image, "https://example.com/dish.jpg");
});

test("persists shared dishes across store instances without changing bundled dishes", async (t) => {
  const { store, file } = await fixture(t);
  const seeds = [{ id: "seed", ...normalizeRecipeInput(input("原有菜品")) }];
  const added = await store.add(input(), seeds);
  assert.match(added.id, /^custom-/);
  assert.deepEqual(await createRecipeStore(file).list(seeds), [...seeds, added]);
  assert.equal(seeds.length, 1);
  await assert.rejects(store.add(input("原有菜品"), seeds), /已经存在/);
});

test("serializes concurrent additions and duplicate checks without losing dishes", async (t) => {
  const { store } = await fixture(t);
  await Promise.all(Array.from({ length: 8 }, (_, index) => store.add(input(`菜${index}`), [])));
  const duplicates = await Promise.allSettled([store.add(input("同名菜"), []), store.add(input("同名菜"), [])]);
  assert.equal(duplicates.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal((await store.list([])).length, 9);
  await store.add(input("后续菜"), []);
  assert.equal((await store.list([])).length, 10);
});

test("fails closed on corrupted storage instead of overwriting recipes", async (t) => {
  const { store, file } = await fixture(t);
  await writeFile(file, "broken data");
  await assert.rejects(store.list([]));
  await assert.rejects(store.add(input(), []));
  assert.equal(await readFile(file, "utf8"), "broken data");
});

// Compile handlers in memory with an isolated store, while using real NextResponse objects.
async function loadRoute(path, store) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const localRequire = createRequire(import.meta.url);
  const module = { exports: {} };
  const routeRequire = (name) => name === "@/data/recipes" ? { recipes: [] }
    : name === "@/lib/recipe-store.mjs" ? { recipeStore: store }
    : name === "@/lib/recipe-input.mjs" ? { normalizeRecipeInput }
    : localRequire(name);
  new Function("require", "module", "exports", compiled)(routeRequire, module, module.exports);
  return module.exports;
}

test("API creates shared recipe, rejects duplicates, and submits/edits history with its ingredients", async (t) => {
  const { store, directory } = await fixture(t);
  const previousFile = process.env.DATA_FILE;
  process.env.DATA_FILE = join(directory, "history.json");
  t.after(() => { if (previousFile === undefined) delete process.env.DATA_FILE; else process.env.DATA_FILE = previousFile; });
  const recipeRoute = await loadRoute("../app/api/recipes/route.ts", store);
  const historyRoute = await loadRoute("../app/api/history/route.ts", store);
  const request = (body) => new Request("http://localhost/api/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const invalid = await recipeRoute.POST(request({}));
  assert.equal(invalid.status, 400);
  const response = await recipeRoute.POST(request(input()));
  assert.equal(response.status, 201);
  const { recipe } = await response.json();
  assert.equal((await recipeRoute.POST(request(input()))).status, 409);
  assert.equal((await (await recipeRoute.GET()).json()).recipes[0].id, recipe.id);
  const submission = await historyRoute.POST(request({ items: [{ recipeId: recipe.id, day: "friday" }, { recipeId: recipe.id, day: "monday" }], note: "家庭菜单" }));
  assert.equal(submission.status, 200);
  const { entry } = await submission.json();
  assert.deepEqual(entry.items.map((item) => item.day), ["monday", "friday"]);
  assert.deepEqual(entry.ingredientSummary.map((item) => item.count), [2, 2]);
  assert.equal(entry.note, "家庭菜单");
  const updated = await historyRoute.PUT(request({ id: entry.id, items: [{ recipeId: recipe.id, day: "sunday" }] }));
  assert.equal(updated.status, 200);
  assert.deepEqual((await updated.json()).entry.ingredientSummary.map((item) => item.count), [1, 1]);
  assert.equal((await historyRoute.DELETE(request({ id: entry.id }))).status, 200);
});
