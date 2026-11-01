import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
function compile(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled)((id) => dependencies[id] ?? require(id), module, module.exports);
  return module.exports;
}
const photos = compile("../data/dish-photos.ts");
const { recipes } = compile("../data/recipes.ts", { "./dish-photos": photos });

test("maps a distinct local photo to every recipe in the complete catalog", () => {
  const ids = new Set(recipes.map((recipe) => recipe.id));
  assert.equal(recipes.length, 79);
  assert.equal(ids.size, 79);
  assert.equal(Object.keys(photos.dishPhotos).length, recipes.length);
  assert.equal(readdirSync(new URL("../public/dishes/photos/", import.meta.url)).filter((file) => file.endsWith(".webp")).length, recipes.length);
  const hashes = new Set();
  for (const [id, image] of Object.entries(photos.dishPhotos)) {
    assert.ok(ids.has(id), id);
    assert.ok(statSync(new URL(`../public${image}`, import.meta.url)).isFile());
    hashes.add(createHash("sha256").update(readFileSync(new URL(`../public${image}`, import.meta.url))).digest("hex"));
  }
  assert.equal(hashes.size, recipes.length);
  assert.ok(recipes.every((recipe) => recipe.image === photos.dishPhotos[recipe.id]));
});

test("ships nonblank optimized 512px WebP photos rather than large generated PNGs", async () => {
  let total = 0;
  for (const image of Object.values(photos.dishPhotos)) {
    const file = new URL(`../public${image}`, import.meta.url);
    const bytes = readFileSync(file);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 512);
    assert.equal(metadata.height, 512);
    const stats = await sharp(bytes).stats();
    assert.ok(stats.channels.some((channel) => channel.stdev > 20), image);
    total += bytes.length;
  }
  assert.ok(total < 8_000_000);
});

test("upgrades old NAS category paths without overwriting visitors' custom images", () => {
  assert.equal(photos.getDishImage({ id: "fanqie_niunan", image: "/dishes/categories/meat.svg" }), "/dishes/photos/fanqie_niunan.webp");
  assert.equal(photos.getDishImage({ id: "fanqie_niunan", image: "https://example.com/my-food.jpg" }), "https://example.com/my-food.jpg");
  assert.equal(photos.getDishImage({ id: "custom", image: "/dishes/categories/meat.svg" }), "/dishes/categories/meat.svg");
});
