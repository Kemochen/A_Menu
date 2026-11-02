import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getBookPages, resolveBookSplit } from "../lib/book-layout.mjs";

const recipes = Array.from({ length: 79 }, (_, index) => `recipe-${index + 1}`);

test("keeps the same nine primary dishes and exposes the next nine as a separate leaf", () => {
  const before = getBookPages(recipes, 1);
  assert.equal(before.primary.length, 9);
  assert.equal(before.extra.length, 9);
  assert.deepEqual(before.primary, recipes.slice(0, 9));
  assert.deepEqual(before.extra, recipes.slice(9, 18));
  assert.deepEqual(getBookPages(recipes, 1).primary, before.primary);
  assert.deepEqual(getBookPages(recipes, 4).primary, recipes.slice(27, 36));
});

test("handles short categories, last pages and out-of-range pages without losing dishes", () => {
  const short = getBookPages(recipes.slice(0, 4), 1);
  assert.equal(short.pageCount, 1);
  assert.equal(short.primary.length, 4);
  assert.equal(short.extra.length, 0);
  const last = getBookPages(recipes, 99);
  assert.equal(last.anchor, 9);
  assert.equal(last.primary.length, 7);
  assert.deepEqual(getBookPages([], 1).primary, []);
  const seen = [];
  for (let page = 1; page <= 9; page += 2) {
    const current = getBookPages(recipes, page);
    seen.push(...current.primary, ...current.extra);
  }
  assert.deepEqual(seen, recipes);
});

test("uses available container space and preserves real asymmetric hinge geometry", () => {
  assert.equal(resolveBookSplit(390), null);
  assert.equal(resolveBookSplit(599), null);
  assert.deepEqual(resolveBookSplit(768), { left: 376, right: 376, gap: 16 });
  assert.deepEqual(resolveBookSplit(800, { x: 420, width: 20 }), { left: 420, right: 360, gap: 20 });
  assert.deepEqual(resolveBookSplit(600, { x: 300, width: 0 }), { left: 294, right: 294, gap: 12 });
  assert.equal(resolveBookSplit(390, { x: 0, width: 0 }), null);
});

test("places the existing leaf on the right and new dishes on the left without duplicating the app", () => {
  const css = readFileSync(new URL("../app/menu.css", import.meta.url), "utf8");
  assert.ok(css.includes('grid-template-areas: "extra primary"'));
  const component = readFileSync(new URL("../components/MenuApp.tsx", import.meta.url), "utf8");
  assert.ok(component.includes("ResizeObserver"));
  assert.ok(component.includes("bookPages.primary.map(renderRecipe)"));
  assert.equal((component.match(/role="search"/g) ?? []).length, 1);
  assert.equal((component.match(/aria-label="菜品分页"/g) ?? []).length, 1);
  assert.ok(css.includes('.book-menu .menu-right-controls'));
  assert.ok(css.includes('margin-left: auto'));
});

test("uses system-owned native navigation, a selection badge, and scene-relative fold regions", () => {
  const root = readFileSync(new URL("../native/App/AMenuApp.swift", import.meta.url), "utf8");
  const swift = readFileSync(new URL("../native/App/FoldLayout.swift", import.meta.url), "utf8");
  assert.ok(root.includes("NavigationView"));
  assert.ok(root.includes("TabView(selection: $tab)"));
  assert.ok(root.includes(".badge(store.draft.items.count)"));
  assert.ok(swift.includes(".division, options: .includeInactive"));
  assert.ok(!swift.includes("UIScreen.main"));
  const prepare = readFileSync(new URL("../scripts/prepare-ios.mjs", import.meta.url), "utf8");
  assert.ok(prepare.includes("native/AMenu.xcodeproj"));
  const ignored = readFileSync(new URL("../.gitignore", import.meta.url), "utf8").split(/\r?\n/);
  assert.ok(ignored.includes("/ios/"));
  assert.ok(!ignored.includes("ios"));
});

test("uses bottom navigation for regular phones and actual fold regions for native book mode", () => {
  const css = readFileSync(new URL("../app/menu.css", import.meta.url), "utf8");
  assert.ok(css.includes('[data-navigation="bottom"] .menu-action-nav'));
  assert.ok(css.includes('[data-navigation="side"] .menu-action-nav'));
  assert.ok(css.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"));
  const native = readFileSync(new URL("../native/App/CatalogView.swift", import.meta.url), "utf8");
  assert.ok(native.includes("BookSplit.resolve(width: width, division: localDivision)"));
  assert.ok(native.includes("if let split = split"));
});
