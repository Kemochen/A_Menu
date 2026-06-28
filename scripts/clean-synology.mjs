import { rmSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set(["node_modules", ".git"]);

function removeIfExists(path) {
  try {
    rmSync(path, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Unable to remove ${path}: ${error.message}`);
  }
}

function cleanDirectory(directory) {
  let entries = [];

  try {
    entries = readdirSync(directory);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(directory, entry);

    if (entry === "@eaDir") {
      removeIfExists(fullPath);
      continue;
    }

    if (ignoredDirectories.has(entry)) {
      continue;
    }

    try {
      if (statSync(fullPath).isDirectory()) {
        cleanDirectory(fullPath);
      }
    } catch {
      continue;
    }
  }
}

removeIfExists(join(root, ".next"));
removeIfExists(join(root, "out"));
cleanDirectory(root);
