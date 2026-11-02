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
  writeFileSync(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const assets = join(output, "Assets.xcassets");
  const icons = join(assets, "AppIcon.appiconset");
  mkdirSync(icons, { recursive: true });
  const logo = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#246447"/><text x="512" y="716" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-weight="700" font-size="660">A</text></svg>');
  const images = [];
  for (const [idiom, size, scales] of [
    ["iphone", 20, [2, 3]], ["iphone", 29, [2, 3]], ["iphone", 40, [2, 3]], ["iphone", 60, [2, 3]],
    ["ipad", 20, [1, 2]], ["ipad", 29, [1, 2]], ["ipad", 40, [1, 2]], ["ipad", 76, [1, 2]], ["ipad", 83.5, [2]],
    ["ios-marketing", 1024, [1]]
  ]) {
    for (const scale of scales) {
      const filename = `${idiom}-${size}-${scale}.png`;
      await sharp(logo).resize(Math.round(size * scale)).flatten({ background: "#246447" }).removeAlpha().png().toFile(join(icons, filename));
      images.push({ idiom, size: `${size}x${size}`, scale: `${scale}x`, filename });
    }
  }
  writeFileSync(join(icons, "Contents.json"), `${JSON.stringify({ images, info: { author: "xcode", version: 1 } }, null, 2)}\n`);
  writeFileSync(join(assets, "Contents.json"), '{"info":{"author":"xcode","version":1}}\n');
}
console.log(`${check ? "Verified" : "Exported"} ${recipes.length} recipes and native JPEG photos.`);
