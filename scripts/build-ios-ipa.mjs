import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") {
  console.error("IPA builds require macOS with Xcode. On Windows, use the Build AltStore IPA workflow.");
  process.exit(1);
}

process.chdir(fileURLToPath(new URL("..", import.meta.url)));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const version = spawnSync("xcodebuild", ["-version"], { encoding: "utf8" });
if (version.error) throw version.error;
if (version.status !== 0) throw new Error(version.stderr || "Unable to read Xcode version.");
console.log(version.stdout);
const match = /^Xcode (\d+)\.(\d+)/m.exec(version.stdout);
if (!match || Number(match[1]) < 27 || (Number(match[1]) === 27 && Number(match[2]) < 1)) {
  throw new Error("This Duo build requires Xcode 27.1 or newer.");
}
run("xcodebuild", [
  "-project", "ios/App/App.xcodeproj",
  "-scheme", "App",
  "-configuration", "Release",
  "-sdk", "iphoneos",
  "-destination", "generic/platform=iOS",
  "-derivedDataPath", "build/ios",
  "CODE_SIGNING_ALLOWED=NO",
  "CODE_SIGNING_REQUIRED=NO",
  "build"
]);

const app = resolve("build/ios/Build/Products/Release-iphoneos/App.app");
if (!existsSync(app)) throw new Error("Xcode did not produce App.app.");

const staging = resolve("build/ios/ipa");
// Only generated packaging files are replaced; source and server data are untouched.
rmSync(staging, { recursive: true, force: true });
mkdirSync(resolve(staging, "Payload"), { recursive: true });
cpSync(app, resolve(staging, "Payload/App.app"), { recursive: true });
mkdirSync("dist", { recursive: true });
const ipa = resolve("dist/A_Menu-altstore.ipa");
run("ditto", ["-c", "-k", "--keepParent", "Payload", ipa], { cwd: staging });
console.log(`Unsigned IPA for AltStore re-signing: ${ipa}`);
