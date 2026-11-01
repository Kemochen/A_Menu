import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { normalizeRecipeInput } from "./recipe-input.mjs";

export function createRecipeStore(file) {
  let queue = Promise.resolve();
  async function read() {
    try {
      const data = JSON.parse(await readFile(file, "utf8"));
      if (!Array.isArray(data.recipes)) throw new Error("菜品库格式不正确。");
      return data.recipes;
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }
  return {
    async list(seeds) { return [...seeds, ...await read()]; },
    add(input, seeds) {
      const run = async () => {
        const recipe = { id: `custom-${randomUUID()}`, ...normalizeRecipeInput(input) };
        const saved = await read();
        if ([...seeds, ...saved].some((item) => item.name.trim().toLocaleLowerCase() === recipe.name.toLocaleLowerCase())) {
          throw new Error("这道菜已经存在，请换一个名称。");
        }
        await mkdir(dirname(file), { recursive: true });
        // Replace atomically so readers never see partially written JSON.
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
          await writeFile(temporary, `${JSON.stringify({ recipes: [...saved, recipe] }, null, 2)}\n`, "utf8");
          await rename(temporary, file);
        } finally {
          await unlink(temporary).catch(() => {});
        }
        return recipe;
      };
      const next = queue.then(run, run);
      queue = next.then(() => undefined, () => undefined);
      return next;
    }
  };
}

const file = process.env.RECIPES_FILE ?? join(dirname(process.env.DATA_FILE ?? join(process.cwd(), "storage", "menu-history.json")), "custom-recipes.json");
export const recipeStore = createRecipeStore(file);
