import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") {
  console.error("Open native/AMenu.xcodeproj on a Mac, or use the Build AltStore IPA workflow.");
  process.exit(1);
}
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const check = spawnSync(process.execPath, ["scripts/export-native-resources.mjs", "--check"], { stdio: "inherit" });
if (check.error) throw check.error;
if (check.status !== 0) process.exit(check.status ?? 1);
console.log("Native SwiftUI project ready: open native/AMenu.xcodeproj");
console.log("No Capacitor sync, WebView, npm dev server, or NAS connection is required to browse the bundled demo.");
