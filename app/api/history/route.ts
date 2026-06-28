import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";
import { recipes } from "@/data/recipes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WeekdayId = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

type IncomingHistoryItem = {
  recipeId: string;
  day: WeekdayId;
};

type HistoryItem = IncomingHistoryItem & {
  recipeName: string;
};

type IngredientUse = {
  name: string;
  count: number;
};

type HistoryEntry = {
  id: string;
  submittedAt: string;
  updatedAt: string;
  items: HistoryItem[];
  ingredientSummary: IngredientUse[];
};

type Store = {
  historyEntries: HistoryEntry[];
};

const weekdayList: WeekdayId[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];
const weekdays = new Set<WeekdayId>(weekdayList);
const weekdayOrder = new Map(weekdayList.map((day, index) => [day, index]));

const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
const dataFile = process.env.DATA_FILE ?? join(process.cwd(), "storage", "menu-history.json");
let writeQueue = Promise.resolve();

function summarizeIngredients(items: HistoryItem[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const recipe = recipesById.get(item.recipeId);
    if (!recipe) {
      continue;
    }

    for (const ingredient of recipe.ingredients) {
      counts.set(ingredient, (counts.get(ingredient) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN")
  );
}

function sortItemsByDay<T extends { day: WeekdayId }>(items: T[]) {
  return [...items].sort((a, b) => Number(weekdayOrder.get(a.day)) - Number(weekdayOrder.get(b.day)));
}

function normalizeItems(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) {
    throw new Error("请选择至少一道菜。");
  }

  const items = value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("菜单数据格式不正确。");
    }

    const candidate = item as Partial<IncomingHistoryItem>;
    const recipe = candidate.recipeId ? recipesById.get(candidate.recipeId) : undefined;

    if (!recipe) {
      throw new Error("包含不存在的菜品。");
    }

    if (!candidate.day || !weekdays.has(candidate.day)) {
      throw new Error("请选择周一到周日的食用日期。");
    }

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      day: candidate.day
    };
  });

  if (items.length === 0) {
    throw new Error("请选择至少一道菜。");
  }

  return sortItemsByDay(items);
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw) as Store;

    return {
      historyEntries: Array.isArray(parsed.historyEntries)
        ? parsed.historyEntries.map((entry) => ({
            ...entry,
            items: sortItemsByDay(entry.items)
          }))
        : []
    };
  } catch {
    return { historyEntries: [] };
  }
}

async function writeStore(store: Store) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

async function mutateStore<T>(operation: (store: Store) => Promise<T> | T) {
  const run = async () => {
    const store = await readStore();
    const result = await operation(store);
    await writeStore(store);
    return result;
  };

  const next = writeQueue.then(run, run);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );

  return next;
}

function sortHistory(historyEntries: HistoryEntry[]) {
  return [...historyEntries].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  const store = await readStore();

  return NextResponse.json({
    historyEntries: sortHistory(store.historyEntries)
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items?: unknown };
    const items = normalizeItems(body.items);
    const now = new Date().toISOString();
    const entry: HistoryEntry = {
      id: randomUUID(),
      submittedAt: now,
      updatedAt: now,
      items,
      ingredientSummary: summarizeIngredients(items)
    };

    const historyEntries = await mutateStore((store) => {
      store.historyEntries = sortHistory([entry, ...store.historyEntries]);
      return store.historyEntries;
    });

    return NextResponse.json({ entry, historyEntries });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "提交失败。");
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; items?: unknown };

    if (!body.id) {
      return badRequest("缺少要修改的记录。");
    }

    const items = normalizeItems(body.items);
    const now = new Date().toISOString();
    let updatedEntry: HistoryEntry | undefined;

    const historyEntries = await mutateStore((store) => {
      const entry = store.historyEntries.find((current) => current.id === body.id);

      if (!entry) {
        throw new Error("找不到这条历史记录。");
      }

      entry.updatedAt = now;
      entry.items = items;
      entry.ingredientSummary = summarizeIngredients(items);
      updatedEntry = entry;
      store.historyEntries = sortHistory(store.historyEntries);

      return store.historyEntries;
    });

    return NextResponse.json({ entry: updatedEntry, historyEntries });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "修改失败。");
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };

    if (!body.id) {
      return badRequest("缺少要删除的记录。");
    }

    const historyEntries = await mutateStore((store) => {
      const nextEntries = store.historyEntries.filter((entry) => entry.id !== body.id);

      if (nextEntries.length === store.historyEntries.length) {
        throw new Error("找不到这条历史记录。");
      }

      store.historyEntries = nextEntries;
      return store.historyEntries;
    });

    return NextResponse.json({ historyEntries });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "删除失败。");
  }
}
