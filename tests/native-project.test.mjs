import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const tooling = createRequire(require.resolve("@capacitor/cli/package.json"));
const xcode = tooling("xcode");
const plist = tooling("plist");
const xml = tooling("xml2js");
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const project = xcode.project(fileURLToPath(new URL("../native/AMenu.xcodeproj/project.pbxproj", import.meta.url)));
project.parseSync();
const sections = project.hash.project.objects;
const entries = (name) => Object.entries(sections[name] ?? {}).filter(([key]) => !key.endsWith("_comment"));
const unquote = (value) => typeof value === "string" ? value.replace(/^"|"$/g, "") : value;

test("native project parses with three targets and has no WebView or third-party iOS packages", () => {
  assert.equal(project.getFirstProject().firstProject.targets.length, 3);
  assert.equal(entries("PBXNativeTarget").length, 3);
  assert.equal(entries("XCRemoteSwiftPackageReference").length, 0);
  const allSwift = readdirSync(new URL("../native/App/", import.meta.url)).filter((name) => name.endsWith(".swift"));
  for (const name of allSwift) {
    const code = source(`native/App/${name}`);
    assert.doesNotMatch(code, /import Capacitor|WKWebView|loadHTMLString|UIScreen\.main/);
    assert.ok(entries("PBXFileReference").some(([, reference]) => unquote(reference.path) === name), name);
  }
});

test("every source is included once in a build phase and every resource resolves", () => {
  const references = Object.fromEntries(entries("PBXFileReference"));
  const buildFiles = Object.fromEntries(entries("PBXBuildFile"));
  const members = entries("PBXSourcesBuildPhase").flatMap(([, phase]) => phase.files.map((id) => buildFiles[id].fileRef));
  assert.equal(members.length, 15);
  assert.equal(new Set(members).size, 15);
  const folders = ["App", "Tests", "UITests"];
  for (const id of members) {
    assert.ok(folders.some((folder) => existsSync(new URL(`../native/${folder}/${unquote(references[id].path)}`, import.meta.url))));
  }
  const resources = entries("PBXResourcesBuildPhase").flatMap(([, phase]) => phase.files.map((id) => unquote(references[buildFiles[id].fileRef].path)));
  assert.deepEqual(resources.sort(), ["Assets.xcassets", "Photos", "PrivacyInfo.xcprivacy", "recipes.json"].sort());
  for (const path of resources) assert.ok(existsSync(new URL(`../native/Resources/${path}`, import.meta.url)));
});

test("normal phone uses iOS 15/Swift 5 and Duo symbols are compiler and runtime gated", () => {
  for (const [, configuration] of entries("XCBuildConfiguration")) {
    assert.equal(String(configuration.buildSettings.IPHONEOS_DEPLOYMENT_TARGET), "15.0");
    if (configuration.buildSettings.SWIFT_VERSION) assert.equal(String(configuration.buildSettings.SWIFT_VERSION), "5.0");
  }
  assert.equal(project.hash.project.objectVersion, 55);
  const fold = source("native/App/FoldLayout.swift");
  assert.match(fold, /#if compiler\(>=6\.4\)[\s\S]*#available\(iOS 27\.1/);
  assert.ok(fold.includes("reservedRegions(kind: .division, options: .includeInactive)"));
});

test("native tabs, single search and right-aligned controls replace browser navigation", () => {
  const root = source("native/App/AMenuApp.swift");
  assert.ok(root.includes("TabView(selection: $tab)"));
  assert.ok(root.includes(".badge(store.draft.items.count)"));
  assert.ok(root.includes("XCTestConfigurationFilePath"));
  const catalog = source("native/App/CatalogView.swift");
  assert.equal((catalog.match(/TextField\("搜索菜名/g) ?? []).length, 1);
  assert.ok(catalog.includes("controls.frame(width: split?.right"));
  assert.ok(catalog.includes("pagination(expanded: split != nil)"));
  assert.ok(catalog.includes("MenuLogic.page(matches, number: current + 1)"));
});

test("native bundle contains 79 matching recipes and valid app icons", () => {
  const recipes = JSON.parse(source("native/Resources/recipes.json"));
  assert.equal(recipes.length, 79);
  const photos = readdirSync(new URL("../native/Resources/Photos/", import.meta.url));
  assert.equal(photos.length, 79);
  for (const recipe of recipes) assert.ok(photos.includes(`${recipe.id}.jpg`));
  const icons = JSON.parse(source("native/Resources/Assets.xcassets/AppIcon.appiconset/Contents.json"));
  for (const icon of icons.images) assert.ok(existsSync(new URL(`../native/Resources/Assets.xcassets/AppIcon.appiconset/${icon.filename}`, import.meta.url)));
  assert.ok(icons.images.some((icon) => icon.idiom === "ios-marketing" && icon.size === "1024x1024"));
});

test("all app icon sizes are opaque PNGs generated from the selected casserole artwork", async () => {
  const sharp = createRequire(require.resolve("next/package.json"))("sharp");
  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const artwork = readFileSync(new URL("../native/Artwork/app-icon.png", import.meta.url));
  const manifest = JSON.parse(source("native/Resources/manifest.json"));
  assert.equal(manifest.appIcon.sourceSHA256, hash(artwork));
  const icons = JSON.parse(source("native/Resources/Assets.xcassets/AppIcon.appiconset/Contents.json"));
  assert.equal(Object.keys(manifest.appIcon.files).length, icons.images.length);
  for (const icon of icons.images) {
    const pixels = Math.round(Number(icon.size.split("x")[0]) * Number(icon.scale.replace("x", "")));
    const bytes = readFileSync(new URL(`../native/Resources/Assets.xcassets/AppIcon.appiconset/${icon.filename}`, import.meta.url));
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, "png");
    assert.equal(metadata.width, pixels);
    assert.equal(metadata.height, pixels);
    assert.equal(metadata.hasAlpha, false);
    assert.equal(hash(bytes), manifest.appIcon.files[icon.filename]);
    const expected = await sharp(artwork).resize(pixels, pixels).flatten({ background: "#ff94ac" }).removeAlpha().png().toBuffer();
    assert.equal(hash(bytes), hash(expected), icon.filename);
  }
});

test("native ATS remains scoped to trusted networks and privacy manifest declares only app preferences", () => {
  const info = plist.parse(source("native/App/Info.plist"));
  const original = JSON.parse(source("mobile/ios-network-policy.json"));
  assert.deepEqual(info.NSAppTransportSecurity, original.NSAppTransportSecurity);
  assert.ok(info.NSLocalNetworkUsageDescription);
  assert.equal(info.NSAppTransportSecurity.NSAllowsArbitraryLoads, undefined);
  const privacy = plist.parse(source("native/Resources/PrivacyInfo.xcprivacy"));
  assert.equal(privacy.NSPrivacyTracking, false);
  assert.deepEqual(privacy.NSPrivacyAccessedAPITypes[0].NSPrivacyAccessedAPITypeReasons, ["CA92.1"]);
});

test("shared Xcode scheme includes real unit/UI tests and the active IPA path is native", async () => {
  const scheme = await xml.parseStringPromise(source("native/AMenu.xcodeproj/xcshareddata/xcschemes/AMenu.xcscheme"));
  const tests = scheme.Scheme.TestAction[0].Testables[0].TestableReference;
  assert.equal(tests.length, 2);
  for (const item of tests) assert.ok(sections.PBXNativeTarget[item.BuildableReference[0].$.BlueprintIdentifier]);
  const prepare = source("scripts/prepare-ios.mjs");
  assert.doesNotMatch(prepare, /cap sync|capacitor\(\[/);
  const ipa = source("scripts/build-ios-ipa.mjs");
  assert.ok(ipa.includes('"native/AMenu.xcodeproj"'));
  assert.ok(ipa.includes("Payload/AMenu.app"));
  const workflow = source(".github/workflows/ios-altstore.yml");
  assert.ok(workflow.includes("ios:test --require-duo"));
  assert.ok(workflow.includes("build/ios/screenshots/"));
});
