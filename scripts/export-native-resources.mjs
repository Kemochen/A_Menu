import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const check = process.argv.includes("--check");
const output = join(root, "native", "Resources");
const hash = (data) => createHash("sha256").update(data).digest("hex");

function load(file, dependencies = {}) {
  const source = readFileSync(join(root, file), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled)((name) => dependencies[name] ?? require(name), module, module.exports);
  return module.exports;
}

const photos = load("data/dish-photos.ts");
const { recipes } = load("data/recipes.ts", { "./dish-photos": photos });
const catalog = `${JSON.stringify(recipes, null, 2)}\n`;
const previous = existsSync(join(output, "manifest.json")) ? JSON.parse(readFileSync(join(output, "manifest.json"), "utf8")) : null;
const manifest = { schemaVersion: 1, catalogSHA256: hash(catalog), photos: {} };

if (!check) mkdirSync(join(output, "Photos"), { recursive: true });
if (check && readFileSync(join(output, "recipes.json"), "utf8") !== catalog) throw Error("Native recipes are stale. Run pnpm run native:resources.");
for (const recipe of recipes) {
  const source = readFileSync(join(root, "public", recipe.image));
  const destination = join(output, "Photos", `${recipe.id}.jpg`);
  const sourceSHA256 = hash(source);
  if (check) {
    const bytes = readFileSync(destination);
    if (previous?.photos[recipe.id]?.sourceSHA256 !== sourceSHA256 || previous?.photos[recipe.id]?.jpegSHA256 !== hash(bytes)) {
      throw Error(`Native photo is stale: ${recipe.id}`);
    }
    const metadata = await sharp(bytes).metadata();
    if (metadata.format !== "jpeg" || metadata.width !== 512 || metadata.height !== 512) throw Error(`Invalid native photo: ${recipe.id}`);
  } else {
    const bytes = await sharp(source).resize(512, 512).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    writeFileSync(destination, bytes);
    manifest.photos[recipe.id] = { sourceSHA256, jpegSHA256: hash(bytes) };
  }
}

if (!check) {
  writeFileSync(join(output, "recipes.json"), catalog);
}

const assets = join(output, "Assets.xcassets");
const icons = join(assets, "AppIcon.appiconset");
const logo = readFileSync(join(root, "native", "Artwork", "app-icon.png"));
const appIcon = { sourceSHA256: hash(logo), files: {} };
const images = [];
if (!check) mkdirSync(icons, { recursive: true });
if (check && previous?.appIcon?.sourceSHA256 !== appIcon.sourceSHA256) throw Error("Native app icon is stale. Run pnpm run native:resources.");
for (const [idiom, size, scales] of [
  ["iphone", 20, [2, 3]], ["iphone", 29, [2, 3]], ["iphone", 40, [2, 3]], ["iphone", 60, [2, 3]],
  ["ipad", 20, [1, 2]], ["ipad", 29, [1, 2]], ["ipad", 40, [1, 2]], ["ipad", 76, [1, 2]], ["ipad", 83.5, [2]],
  ["ios-marketing", 1024, [1]]
]) {
  for (const scale of scales) {
    const filename = `${idiom}-${size}-${scale}.png`;
    const pixels = Math.round(size * scale);
    const destination = join(icons, filename);
    if (check) {
      const bytes = readFileSync(destination);
      const metadata = await sharp(bytes).metadata();
      if (previous?.appIcon?.files?.[filename] !== hash(bytes) || metadata.format !== "png" || metadata.width !== pixels || metadata.height !== pixels || metadata.hasAlpha) {
        throw Error(`Invalid or stale native app icon: ${filename}`);
      }
    } else {
      const bytes = await sharp(logo).resize(pixels, pixels).flatten({ background: "#ff94ac" }).removeAlpha().png().toBuffer();
      writeFileSync(destination, bytes);
      appIcon.files[filename] = hash(bytes);
    }
    images.push({ idiom, size: `${size}x${size}`, scale: `${scale}x`, filename });
  }
}
const iconContents = `${JSON.stringify({ images, info: { author: "xcode", version: 1 } }, null, 2)}\n`;
if (check) {
  if (readFileSync(join(icons, "Contents.json"), "utf8") !== iconContents) throw Error("Native app icon catalog is stale.");
} else {
  manifest.appIcon = appIcon;
  writeFileSync(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(icons, "Contents.json"), iconContents);
  writeFileSync(join(assets, "Contents.json"), '{"info":{"author":"xcode","version":1}}\n');
}
console.log(`${check ? "Verified" : "Exported"} ${recipes.length} recipes, native JPEG photos and ${images.length} app icons.`);
