import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const defaultRecipesCsv = "\\\\ckm_nas\\Drive1\\CZQ\\Menu_Recipes.csv";
const defaultIngredientsCsv = "\\\\ckm_nas\\Drive1\\CZQ\\Menu_Recipe_Ingredients.csv";

const recipesCsv = process.argv[2] ?? defaultRecipesCsv;
const ingredientsCsv = process.argv[3] ?? defaultIngredientsCsv;
const dataOutput = join(projectRoot, "data", "recipes.ts");
const dishesDir = join(projectRoot, "public", "dishes");
const categoryDishesDir = join(dishesDir, "categories");

const weatherValues = new Set(["cold", "hot", "both"]);
const categorySlugs = {
  "主食类": "staple",
  "肉类": "meat",
  "海鲜类": "seafood",
  "素菜": "vegetable",
  "汤类": "soup",
  "家常菜": "home-style",
  "甜品": "dessert",
  "早餐": "breakfast",
  "其他": "other"
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((cell) => cell.replace(/^\uFEFF/, "").trim());

  return rows.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? "").trim()]))
  );
}

function splitTags(value) {
  return value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeCategory(value) {
  const category = value.trim();

  if (!category) {
    return "其他";
  }

  if (category.includes("主食类") || category.includes("饭类") || category.includes("面类")) {
    return "主食类";
  }

  return category;
}

function categoryImageFor(category) {
  return `/dishes/categories/${categorySlugs[category] ?? categorySlugs["其他"]}.svg`;
}

function addTag(tags, value) {
  if (value && !tags.includes(value)) {
    tags.push(value);
  }
}

function inferTags(baseTags, recipe) {
  const tags = [...baseTags];
  const haystack = `${recipe.name} ${recipe.category} ${recipe.ingredients.join(" ")} ${baseTags.join(" ")}`;

  if (recipe.category === "肉类") addTag(tags, "肉菜");
  if (recipe.category === "海鲜类") addTag(tags, "海鲜");
  if (recipe.category === "素菜") addTag(tags, "素菜");
  if (recipe.category === "主食类") addTag(tags, "主食");
  if (recipe.category === "汤类") addTag(tags, "汤类");
  if (recipe.category === "早餐") addTag(tags, "早餐");
  if (recipe.category === "甜品") addTag(tags, "甜品");

  if (/牛腩|牛肉|牛排|牛肋条|肥牛|牛柳/.test(haystack)) addTag(tags, "牛肉");
  if (/牛蛙/.test(haystack)) addTag(tags, "牛蛙");
  if (/鸡翅|鸡腿|鸡块|鸡肉|鸡汤|黄焖鸡/.test(haystack)) addTag(tags, "鸡肉");
  if (/排骨|小排|五花肉|里脊|猪|肉丝|肉末|肉丸|腊肠|咸肉/.test(haystack)) addTag(tags, "猪肉");
  if (/羊/.test(haystack)) addTag(tags, "羊肉");
  if (/虾|虾仁|龙虾/.test(haystack)) addTag(tags, "虾");
  if (/酸菜鱼|鳕鱼|三文鱼|鱼头|鱼片|鱼肉|鱼排|带鱼|鲈鱼|鲫鱼|白身鱼/.test(haystack)) {
    addTag(tags, "鱼类");
  }
  if (/豆腐|豆角|青豆/.test(haystack)) addTag(tags, "豆制品");
  if (/蛋|鸡蛋|蛋挞/.test(haystack)) addTag(tags, "鸡蛋");
  if (!/不辣/.test(haystack) && /微辣|香辣|麻辣|辣炖|辣椒|辣酱|青花椒|干锅|豆瓣/.test(haystack)) {
    addTag(tags, "辣味");
  }
  if (/蒜|蒜蓉/.test(haystack)) addTag(tags, "蒜香");
  if (/番茄|西红柿/.test(haystack)) addTag(tags, "番茄");
  if (/咖喱|gali/i.test(haystack)) addTag(tags, "咖喱");
  if (/炖|汤|煲|焖|卤/.test(haystack)) addTag(tags, "炖煮");
  if (/炒|煎|烤|蒸/.test(haystack)) addTag(tags, "快手");
  if (recipe.weather === "cold") addTag(tags, "适合天冷");
  if (recipe.weather === "hot") addTag(tags, "适合天热");
  if (recipe.weather === "both") addTag(tags, "四季");

  return tags.slice(0, 6);
}

function escapeSvg(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function categoryArtwork(category) {
  const common = `
  <ellipse cx="320" cy="370" rx="210" ry="36" fill="#241f1b" opacity=".14"/>
  <ellipse cx="320" cy="286" rx="210" ry="112" fill="#fff8ed"/>
  <ellipse cx="320" cy="288" rx="168" ry="80" fill="#f5efe2"/>`;

  const art = {
    "肉类": {
      bg: "#f8dccf",
      accent: "#be4a34",
      body: `${common}
  <path d="M208 286c28-80 148-120 224-58 56 46 42 126-28 148-72 23-166 0-196-90Z" fill="#b74334"/>
  <path d="M244 276c28-50 104-76 154-34 35 29 26 76-18 94-55 22-128 3-136-60Z" fill="#e58a62"/>
  <circle cx="418" cy="216" r="36" fill="#fff3e2"/>
  <circle cx="418" cy="216" r="18" fill="#e9d7c3"/>
  <path d="M198 220c44-22 106-38 166-25" fill="none" stroke="#fff1dc" stroke-width="12" stroke-linecap="round" opacity=".65"/>
  <circle cx="224" cy="330" r="16" fill="#4c9d69"/>
  <circle cx="458" cy="310" r="14" fill="#4c9d69"/>`
    },
    "海鲜类": {
      bg: "#d8eef6",
      accent: "#2f8eac",
      body: `${common}
  <path d="M190 284c62-78 172-96 262-16-90 76-200 68-262 16Z" fill="#459fba"/>
  <path d="M452 268l72-42-20 72 20 72-72-42c16-20 16-40 0-60Z" fill="#2f7894"/>
  <circle cx="244" cy="270" r="10" fill="#173c4a"/>
  <path d="M286 230c30 30 30 78 0 108M332 220c36 40 36 96 0 132M380 232c24 34 24 72 0 106" fill="none" stroke="#e7f7fb" stroke-width="12" stroke-linecap="round"/>
  <circle cx="170" cy="190" r="14" fill="#ffffff" opacity=".7"/>
  <circle cx="494" cy="176" r="20" fill="#ffffff" opacity=".55"/>
  <circle cx="516" cy="244" r="10" fill="#ffffff" opacity=".65"/>`
    },
    "素菜": {
      bg: "#dff1d7",
      accent: "#4f9f65",
      body: `${common}
  <circle cx="270" cy="268" r="58" fill="#61ad64"/>
  <circle cx="344" cy="242" r="70" fill="#4d9b59"/>
  <circle cx="388" cy="306" r="56" fill="#79bd6d"/>
  <path d="M242 302c56-56 126-74 204-28" fill="none" stroke="#286c43" stroke-width="18" stroke-linecap="round" opacity=".45"/>
  <path d="M222 350c46-30 72-82 66-138" fill="none" stroke="#f4fff0" stroke-width="12" stroke-linecap="round" opacity=".7"/>
  <circle cx="424" cy="226" r="18" fill="#f6d35c"/>
  <circle cx="210" cy="250" r="16" fill="#e45c4d"/>`
    },
    "主食类": {
      bg: "#f3e2c7",
      accent: "#b98248",
      body: `${common}
  <path d="M206 274c42-74 184-92 244-14 34 44 10 102-60 122-90 26-202-18-184-108Z" fill="#d5a868"/>
  <path d="M244 248c56-34 142-30 182 20" fill="none" stroke="#fff5dc" stroke-width="16" stroke-linecap="round" opacity=".85"/>
  <path d="M246 300c54-28 132-26 176 16" fill="none" stroke="#fff5dc" stroke-width="14" stroke-linecap="round" opacity=".72"/>
  <circle cx="280" cy="286" r="18" fill="#ef6b4b"/>
  <circle cx="352" cy="258" r="16" fill="#5b9c62"/>
  <circle cx="392" cy="314" r="14" fill="#f1cf55"/>`
    },
    "汤类": {
      bg: "#e5e0f3",
      accent: "#7b6eb0",
      body: `${common}
  <path d="M182 258h276c-4 82-58 130-138 130s-134-48-138-130Z" fill="#7867a8"/>
  <ellipse cx="320" cy="258" rx="138" ry="42" fill="#a893ce"/>
  <ellipse cx="320" cy="252" rx="104" ry="26" fill="#f3c66e"/>
  <path d="M252 162c-22 28 22 34 2 64M320 148c-28 32 26 40-2 78M388 164c-24 28 22 34 2 64" fill="none" stroke="#fff7ec" stroke-width="14" stroke-linecap="round" opacity=".8"/>
  <circle cx="278" cy="250" r="12" fill="#5aae6e"/>
  <circle cx="354" cy="246" r="10" fill="#d95647"/>`
    },
    "家常菜": {
      bg: "#f7e4bb",
      accent: "#d99235",
      body: `${common}
  <ellipse cx="320" cy="280" rx="150" ry="74" fill="#d99235"/>
  <path d="M206 282c66-48 164-62 232 10" fill="none" stroke="#fff0c8" stroke-width="18" stroke-linecap="round" opacity=".65"/>
  <circle cx="260" cy="272" r="22" fill="#d94f43"/>
  <circle cx="334" cy="246" r="20" fill="#4e9b62"/>
  <circle cx="402" cy="302" r="24" fill="#f1ce62"/>
  <path d="M214 344c70 30 150 30 220 0" fill="none" stroke="#7d5129" stroke-width="12" stroke-linecap="round" opacity=".35"/>`
    },
    "早餐": {
      bg: "#f6e8c9",
      accent: "#dca846",
      body: `${common}
  <circle cx="272" cy="270" r="62" fill="#fff8e8"/>
  <circle cx="272" cy="270" r="26" fill="#f3b73c"/>
  <rect x="330" y="214" width="94" height="126" rx="22" fill="#b87943"/>
  <path d="M346 236h62M346 262h62M346 288h62" stroke="#f7d9a8" stroke-width="10" stroke-linecap="round"/>
  <path d="M448 226c32 12 44 42 30 76-12 28-38 44-68 44" fill="none" stroke="#fff8e8" stroke-width="16" stroke-linecap="round"/>`
    },
    "甜品": {
      bg: "#f7dde7",
      accent: "#c65f86",
      body: `${common}
  <path d="M224 330h194l-30 58H254l-30-58Z" fill="#8f5b45"/>
  <path d="M236 250h170l12 80H224l12-80Z" fill="#f3bfd1"/>
  <path d="M246 250c20-52 120-66 150 0H246Z" fill="#fff5eb"/>
  <circle cx="320" cy="204" r="20" fill="#d94f5a"/>
  <path d="M258 286h120" stroke="#fff6ea" stroke-width="14" stroke-linecap="round" opacity=".8"/>`
    }
  };

  return art[category] ?? {
    bg: "#ece5d8",
    accent: "#8d7c63",
    body: `${common}
  <ellipse cx="320" cy="282" rx="142" ry="70" fill="#9a8768"/>
  <circle cx="270" cy="266" r="24" fill="#d95f4b"/>
  <circle cx="340" cy="246" r="22" fill="#58a76a"/>
  <circle cx="390" cy="304" r="20" fill="#f1c75a"/>`
  };
}

function svgForCategory(category) {
  const artwork = categoryArtwork(category);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480" role="img" aria-labelledby="title desc">
  <title id="title">${escapeSvg(category)}</title>
  <desc id="desc">${escapeSvg(category)}分类菜品插画</desc>
  <defs>
    <radialGradient id="light" cx="36%" cy="20%" r="78%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".78"/>
      <stop offset="58%" stop-color="#ffffff" stop-opacity=".22"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="640" height="480" rx="32" fill="${artwork.bg}"/>
  <rect width="640" height="480" rx="32" fill="url(#light)"/>
  <circle cx="110" cy="98" r="46" fill="#ffffff" opacity=".32"/>
  <circle cx="548" cy="112" r="64" fill="#ffffff" opacity=".22"/>
  <circle cx="520" cy="370" r="32" fill="${artwork.accent}" opacity=".16"/>
  ${artwork.body}
</svg>
`;
}

function toTsString(value) {
  return JSON.stringify(value);
}

function buildRecipesTs(recipes) {
  const recipeBlocks = recipes.map((recipe) => `  {
    id: ${toTsString(recipe.id)},
    name: ${toTsString(recipe.name)},
    category: ${toTsString(recipe.category)},
    tags: ${JSON.stringify(recipe.tags)},
    weather: ${toTsString(recipe.weather)},
    image: ${toTsString(recipe.image)},
    ingredients: ${JSON.stringify(recipe.ingredients)},
    ingredientTypes: ${JSON.stringify(recipe.ingredientTypes)}
  }`);

  return `export type WeatherSuitability = "cold" | "hot" | "both";

export type Recipe = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  weather: WeatherSuitability;
  image: string;
  ingredients: string[];
  ingredientTypes: Record<string, string>;
  initialLastEatenDaysAgo?: number;
};

export const weatherSymbols: Record<WeatherSuitability, string> = {
  cold: "\\u2744\\uFE0F",
  hot: "\\u2600\\uFE0F",
  both: "\\uD83C\\uDF24\\uFE0F"
};

export const weatherLabels: Record<WeatherSuitability, string> = {
  cold: "适合冷天",
  hot: "适合热天",
  both: "冷热都适合"
};

export const recipes: Recipe[] = [
${recipeBlocks.join(",\n")}
];
`;
}

async function main() {
  const [recipesText, ingredientsText] = await Promise.all([
    readFile(recipesCsv, "utf8"),
    readFile(ingredientsCsv, "utf8")
  ]);

  const recipeRows = parseCsv(recipesText);
  const ingredientRows = parseCsv(ingredientsText);
  const ingredientsByRecipe = new Map();

  for (const row of ingredientRows) {
    if (!row.recipe_id || !row.ingredient_name) {
      continue;
    }

    const list = ingredientsByRecipe.get(row.recipe_id) ?? [];
    list.push({
      name: row.ingredient_name,
      type: row.ingredient_type || "其他"
    });
    ingredientsByRecipe.set(row.recipe_id, list);
  }

  const recipes = recipeRows.map((row) => {
    const weather = weatherValues.has(row.weather) ? row.weather : "both";
    const ingredients = ingredientsByRecipe.get(row.id) ?? [];
    const category = normalizeCategory(row.category || "其他");
    const recipe = {
      id: row.id,
      name: row.name,
      category,
      tags: [],
      weather,
      image: categoryImageFor(category),
      ingredients: ingredients.map((ingredient) => ingredient.name),
      ingredientTypes: Object.fromEntries(
        ingredients.map((ingredient) => [ingredient.name, ingredient.type || "其他"])
      )
    };

    return {
      ...recipe,
      tags: inferTags(splitTags(row.tags), recipe)
    };
  });

  const missingIngredients = recipes.filter((recipe) => recipe.ingredients.length === 0);
  if (missingIngredients.length > 0) {
    console.warn(
      `Warning: ${missingIngredients.length} recipes have no ingredients: ${missingIngredients
        .map((recipe) => recipe.id)
        .join(", ")}`
    );
  }

  const categories = [...new Set(recipes.map((recipe) => recipe.category))];
  await mkdir(categoryDishesDir, { recursive: true });
  const existingDishImages = await readdir(dishesDir);
  await Promise.all(
    existingDishImages
      .filter((file) => file.endsWith(".svg"))
      .map((file) => rm(join(dishesDir, file), { force: true }))
  );
  await rm(categoryDishesDir, { recursive: true, force: true });
  await mkdir(categoryDishesDir, { recursive: true });

  await writeFile(dataOutput, buildRecipesTs(recipes), "utf8");
  await Promise.all(
    categories.map((category) =>
      writeFile(
        join(categoryDishesDir, `${categorySlugs[category] ?? categorySlugs["其他"]}.svg`),
        svgForCategory(category),
        "utf8"
      )
    )
  );

  console.log(
    `Imported ${recipes.length} recipes, ${ingredientRows.length} ingredient rows, generated ${categories.length} category images.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
