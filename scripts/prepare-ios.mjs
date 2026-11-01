import { cpSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") {
  console.error("iOS preparation requires macOS with Xcode. On Windows, use the Build AltStore IPA workflow.");
  process.exit(1);
}

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const cli = fileURLToPath(new URL("../node_modules/@capacitor/cli/bin/capacitor", import.meta.url));
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));

const build = spawnSync(process.execPath, [vite, "build", "--config", "mobile/vite.config.mjs"], {
  stdio: "inherit"
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

function capacitor(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync("ios/App/App.xcodeproj")) {
  capacitor(["add", "ios", "--packagemanager", "SPM"]);
}

capacitor(["sync", "ios"]);
cpSync("mobile/ios/SceneDelegate.swift", "ios/App/App/SceneDelegate.swift");

const info = "ios/App/App/Info.plist";
const permissionKey = ":NSLocalNetworkUsageDescription";
const existingPermission = spawnSync("/usr/libexec/PlistBuddy", ["-c", `Print ${permissionKey}`, info], {
  stdio: "ignore"
});
const command = existingPermission.status === 0
  ? `Set ${permissionKey} 连接家庭群晖以同步菜单和历史记录。`
  : `Add ${permissionKey} string 连接家庭群晖以同步菜单和历史记录。`;
const permission = spawnSync("/usr/libexec/PlistBuddy", ["-c", command, info], { stdio: "inherit" });
if (permission.error) throw permission.error;
if (permission.status !== 0) process.exit(permission.status ?? 1);

function configurePlist(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

mkdirSync("build/ios", { recursive: true });
const policyFile = "build/ios/network-policy.plist";
configurePlist("plutil", ["-convert", "xml1", "-o", policyFile, "mobile/ios-network-policy.json"]);
const existingTransport = spawnSync("/usr/libexec/PlistBuddy", ["-c", "Print :NSAppTransportSecurity", info], {
  stdio: "ignore"
});
if (existingTransport.error) throw existingTransport.error;
if (existingTransport.status === 0) {
  configurePlist("/usr/libexec/PlistBuddy", ["-c", "Delete :NSAppTransportSecurity", info]);
}
configurePlist("/usr/libexec/PlistBuddy", ["-c", `Merge ${policyFile}`, info]);
