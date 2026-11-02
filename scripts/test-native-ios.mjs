import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") throw Error("Native simulator tests require macOS and Xcode. Windows can run pnpm run test:native-config.");
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
function run(command, args, capture = false, allowFailure = false) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: capture ? "pipe" : "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) throw Error(`${command} ${args.join(" ")} failed (${result.status}): ${result.stderr ?? ""}`);
  return result;
}
const version = run("xcodebuild", ["-version"], true).stdout;
const match = /^Xcode (\d+)\.(\d+)/m.exec(version);
if (!match || Number(match[1]) < 27 || (Number(match[1]) === 27 && Number(match[2]) < 1)) {
  throw Error("This cloud simulator script requires Xcode 27.1+. With Xcode 13.2.1, use Product > Test in native/AMenu.xcodeproj for regular-phone tests.");
}
const inventory = JSON.parse(run("xcrun", ["simctl", "list", "devices", "available", "--json"], true).stdout);
const phones = Object.entries(inventory.devices).filter(([runtime]) => runtime.includes(".iOS-")).flatMap(([, devices]) => devices)
  .filter((device) => device.isAvailable !== false && device.name.includes("iPhone"));
const regular = phones.filter((device) => !device.name.includes("Duo"))
  .sort((a, b) => Number(!/SE|mini/.test(a.name)) - Number(!/SE|mini/.test(b.name)) || a.name.localeCompare(b.name))[0];
if (!regular) throw Error("No ordinary iPhone simulator is installed in the selected Xcode.");
let duo = phones.find((device) => device.name.includes("Duo"));
let createdDuo = false;
if (!duo) {
  const types = JSON.parse(run("xcrun", ["simctl", "list", "devicetypes", "--json"], true).stdout).devicetypes;
  const type = types.find((item) => item.name.includes("iPhone Duo"));
  const runtimes = JSON.parse(run("xcrun", ["simctl", "list", "runtimes", "--json"], true).stdout).runtimes;
  const runtime = runtimes.filter((item) => item.isAvailable && item.identifier.includes(".iOS-") && Number(item.version.split(".")[0]) >= 27)
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0];
  if (type && runtime) {
    const udid = run("xcrun", ["simctl", "create", "AMenu Duo Tests", type.identifier, runtime.identifier], true).stdout.trim();
    if (!/^[0-9A-F-]{36}$/i.test(udid)) throw Error("simctl returned an invalid device identifier.");
    duo = { udid, name: "AMenu Duo Tests", state: "Shutdown" }; createdDuo = true;
  }
}
if (!duo && process.argv.includes("--require-duo")) throw Error("Duo simulator/runtime is missing. Install it in Xcode before running the required Duo tests.");
const destinations = [{ device: regular, label: "phone" }, ...(duo ? [{ device: duo, label: "duo" }] : [])];
try {
  for (const { device, label } of destinations) {
    const resultPath = resolve(`build/ios/tests/${label}-${Date.now()}.xcresult`);
    const screenshots = resolve(`build/ios/screenshots/${label}`);
    mkdirSync(resolve("build/ios/tests"), { recursive: true });
    mkdirSync(screenshots, { recursive: true });
    const wasBooted = device.state === "Booted";
    try {
      if (!wasBooted) run("xcrun", ["simctl", "boot", device.udid]);
      run("xcrun", ["simctl", "bootstatus", device.udid, "-b"]);
      const result = run("xcodebuild", ["test", "-project", "native/AMenu.xcodeproj", "-scheme", "AMenu", "-configuration", "Debug",
        "-destination", `id=${device.udid}`, "-derivedDataPath", "build/ios", "-resultBundlePath", resultPath,
        "-parallel-testing-enabled", "NO", "CODE_SIGNING_ALLOWED=NO"], false, true);
      if (existsSync(resultPath)) run("xcrun", ["xcresulttool", "export", "attachments", "--path", resultPath, "--output-path", screenshots], false, true);
      if (result.status !== 0) throw Error(`${device.name} native tests failed. Inspect the uploaded xcresult and screenshots.`);
    } finally {
      if (!wasBooted) run("xcrun", ["simctl", "shutdown", device.udid], false, true);
    }
  }
} finally {
  if (createdDuo) run("xcrun", ["simctl", "delete", duo.udid], false, true);
}
console.log("Native unit/UI tests completed. Screenshots: build/ios/screenshots");
