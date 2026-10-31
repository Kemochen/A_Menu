"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Recipe } from "@/data/recipes";
import { weatherLabels, weatherSymbols } from "@/data/recipes";

type WeekdayId = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

type PlannedDish = {
  id: string;
  recipeId: string;
  day: WeekdayId;
};

type HistoryItem = {
  recipeId: string;
  recipeName: string;
  day: WeekdayId;
};

type IngredientUse = {
  name: string;
  count: number;
};

type IngredientGroup = {
  category: string;
  ingredients: IngredientUse[];
};

type HistoryEntry = {
  id: string;
  submittedAt: string;
  updatedAt?: string;
  note?: string;
  items: HistoryItem[];
  ingredientSummary: IngredientUse[];
};

type HistoryResponse = {
  entry?: HistoryEntry;
  historyEntries: HistoryEntry[];
  error?: string;
};

type MenuAppProps = {
  recipes: Recipe[];
};

const allCategory = "全部";
const recipesPerPage = 21;

const ingredientCategoryOrder = [
  "蔬菜",
  "肉类",
  "海鲜",
  "主食",
  "豆制品",
  "蛋奶",
  "水果",
  "调料",
  "菌菇",
  "其他"
];

const weekdays: { id: WeekdayId; label: string }[] = [
  { id: "monday", label: "周一" },
  { id: "tuesday", label: "周二" },
  { id: "wednesday", label: "周三" },
  { id: "thursday", label: "周四" },
  { id: "friday", label: "周五" },
  { id: "saturday", label: "周六" },
  { id: "sunday", label: "周日" }
];

const weekdayLabels = Object.fromEntries(weekdays.map((day) => [day.id, day.label])) as Record<
  WeekdayId,
  string
>;
const weekdayOrder = Object.fromEntries(weekdays.map((day, index) => [day.id, index])) as Record<
  WeekdayId,
  number
>;

function sortItemsByDay<T extends { day: WeekdayId }>(items: T[]) {
  return [...items].sort((a, b) => weekdayOrder[a.day] - weekdayOrder[b.day]);
}

function summarizeIngredients(items: PlannedDish[], recipes: Recipe[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const recipe = recipes.find((currentRecipe) => currentRecipe.id === item.recipeId);
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

function buildIngredientCategoryMap(recipes: Recipe[]) {
  const result = new Map<string, string>();

  for (const recipe of recipes) {
    for (const [ingredientName, category] of Object.entries(recipe.ingredientTypes ?? {})) {
      if (!result.has(ingredientName)) {
        result.set(ingredientName, category || "其他");
      }
    }
  }

  return result;
}

function getIngredientCategorySortIndex(category: string) {
  const index = ingredientCategoryOrder.indexOf(category);

  return index === -1 ? ingredientCategoryOrder.length : index;
}

function groupIngredientsByCategory(
  summary: IngredientUse[],
  ingredientCategoryMap: Map<string, string>
): IngredientGroup[] {
  const groups = new Map<string, IngredientUse[]>();

  for (const ingredient of summary) {
    const category = ingredientCategoryMap.get(ingredient.name) ?? "其他";
    groups.set(category, [...(groups.get(category) ?? []), ingredient]);
  }

  return Array.from(groups, ([category, ingredients]) => ({
    category,
    ingredients: [...ingredients].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
  })).sort(
    (a, b) =>
      getIngredientCategorySortIndex(a.category) - getIngredientCategorySortIndex(b.category) ||
      a.category.localeCompare(b.category, "zh-CN")
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatRelativeTime(value?: string) {
  if (!value) {
    return "暂无记录";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86_400_000));

  if (diffDays === 0) {
    return "今天";
  }

  if (diffDays === 1) {
    return "昨天";
  }

  if (diffDays < 7) {
    return `${diffDays}天前`;
  }

  if (diffDays < 14) {
    return "一周前";
  }

  if (diffDays < 21) {
    return "两周前";
  }

  if (diffDays < 60) {
    return `${Math.floor(diffDays / 7)}周前`;
  }

  if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)}个月前`;
  }

  return `${Math.floor(diffDays / 365)}年前`;
}

function isLastWeek(value: string) {
  const date = new Date(value);
  const today = new Date();
  const startOfThisWeek = new Date(today);
  const day = today.getDay() === 0 ? 7 : today.getDay();

  startOfThisWeek.setHours(0, 0, 0, 0);
  startOfThisWeek.setDate(today.getDate() - day + 1);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  return date >= startOfLastWeek && date < startOfThisWeek;
}

async function readHistory() {
  const response = await fetch("/api/history", { cache: "no-store" });
  const data = (await response.json()) as HistoryResponse;

  if (!response.ok) {
    throw new Error(data.error ?? "读取历史记录失败。");
  }

  return data.historyEntries;
}

async function saveHistory(method: "POST" | "PUT" | "DELETE", body: unknown) {
  const response = await fetch("/api/history", {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = (await response.json()) as HistoryResponse;

  if (!response.ok) {
    throw new Error(data.error ?? "操作失败。");
  }

  return data;
}

export function MenuApp({ recipes }: MenuAppProps) {
  const [activeCategory, setActiveCategory] = useState(allCategory);
  const [plannedDishes, setPlannedDishes] = useState<PlannedDish[]>([]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [selectedDayByRecipe, setSelectedDayByRecipe] = useState<Record<string, WeekdayId>>({});
  const [historyFilter, setHistoryFilter] = useState<"all" | "last-week">("all");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"plan" | "history" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [submittedEntry, setSubmittedEntry] = useState<HistoryEntry | null>(null);
  const [note, setNote] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const recipesById = useMemo(
    () => Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe])) as Record<string, Recipe>,
    [recipes]
  );
  const ingredientCategoryMap = useMemo(() => buildIngredientCategoryMap(recipes), [recipes]);

  const loadHistory = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoadingHistory(true);
    }

    try {
      const entries = await readHistory();
      setHistoryEntries(entries);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "读取历史记录失败。");
    } finally {
      if (showLoading) {
        setIsLoadingHistory(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadHistory(true);
  }, [loadHistory]);

  useEffect(() => {
    if (activePanel === "history") {
      void loadHistory(true);
    }
  }, [activePanel, loadHistory]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadHistory(false);
    }, 10_000);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadHistory(false);
      }
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadHistory]);

  const selectedRecipe = selectedRecipeId ? recipesById[selectedRecipeId] : null;

  const lastEatenByRecipe = useMemo(() => {
    const today = new Date();
    const result: Record<string, string> = {};

    for (const recipe of recipes) {
      if (recipe.initialLastEatenDaysAgo) {
        const date = new Date(today);
        date.setDate(today.getDate() - recipe.initialLastEatenDaysAgo);
        result[recipe.id] = date.toISOString();
      }
    }

    for (const entry of historyEntries) {
      for (const item of entry.items) {
        const current = result[item.recipeId];

        if (!current || new Date(entry.submittedAt) > new Date(current)) {
          result[item.recipeId] = entry.submittedAt;
        }
      }
    }

    return result;
  }, [historyEntries, recipes]);

  const categories = useMemo(
    () => [allCategory, ...Array.from(new Set(recipes.map((recipe) => recipe.category)))],
    [recipes]
  );

  const filteredRecipes = useMemo(
    () =>
      activeCategory === allCategory
        ? recipes
        : recipes.filter((recipe) => recipe.category === activeCategory),
    [activeCategory, recipes]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  const pageCount = Math.max(1, Math.ceil(filteredRecipes.length / recipesPerPage));
  const paginatedRecipes = useMemo(
    () =>
      filteredRecipes.slice(
        (currentPage - 1) * recipesPerPage,
        currentPage * recipesPerPage
      ),
    [currentPage, filteredRecipes]
  );

  const ingredientSummary = useMemo(
    () => summarizeIngredients(plannedDishes, recipes),
    [plannedDishes, recipes]
  );

  const submittedShoppingList = useMemo(
    () =>
      submittedEntry
        ? groupIngredientsByCategory(submittedEntry.ingredientSummary, ingredientCategoryMap)
        : [],
    [ingredientCategoryMap, submittedEntry]
  );

  const plannedByDay = useMemo(() => {
    return weekdays.map((day) => ({
      ...day,
      items: plannedDishes.filter((item) => item.day === day.id)
    }));
  }, [plannedDishes]);

  const plannedDaysByRecipe = useMemo(() => {
    const result: Record<string, WeekdayId[]> = {};

    for (const item of plannedDishes) {
      result[item.recipeId] = [...(result[item.recipeId] ?? []), item.day];
    }

    for (const recipeId of Object.keys(result)) {
      result[recipeId] = sortItemsByDay(result[recipeId].map((day) => ({ day }))).map(
        (item) => item.day
      );
    }

    return result;
  }, [plannedDishes]);

  const visibleHistory = useMemo(
    () =>
      historyFilter === "last-week"
        ? historyEntries.filter((entry) => isLastWeek(entry.submittedAt))
        : historyEntries,
    [historyEntries, historyFilter]
  );

  function addRecipeToPlan(recipeId: string) {
    const day = selectedDayByRecipe[recipeId] ?? "monday";
    const alreadyPlanned = plannedDishes.some(
      (item) => item.recipeId === recipeId && item.day === day
    );

    if (alreadyPlanned) {
      setNotice("这道菜已经安排在这一天了。");
      return;
    }

    setPlannedDishes([
      ...plannedDishes,
      {
        id: `${recipeId}-${day}-${Date.now()}`,
        recipeId,
        day
      }
    ]);
    setSelectedRecipeId(null);
    setSubmittedEntry(null);
    setNotice("");
  }

  function removePlannedDish(itemId: string) {
    setPlannedDishes(plannedDishes.filter((item) => item.id !== itemId));
    setSubmittedEntry(null);
  }

  function updatePlannedDishDay(itemId: string, day: WeekdayId) {
    const target = plannedDishes.find((item) => item.id === itemId);

    if (!target) {
      return;
    }

    const alreadyPlanned = plannedDishes.some(
      (item) => item.id !== itemId && item.recipeId === target.recipeId && item.day === day
    );

    if (alreadyPlanned) {
      setNotice("这道菜已经安排在这一天了。");
      return;
    }

    setPlannedDishes(
      plannedDishes.map((item) => (item.id === itemId ? { ...item, day } : item))
    );
    setSubmittedEntry(null);
    setNotice("");
  }

  function clearPlan() {
    setPlannedDishes([]);
    setEditingEntryId(null);
    setSubmittedEntry(null);
    setNote("");
    setNotice("");
  }

  function editHistory(entry: HistoryEntry) {
    setEditingEntryId(entry.id);
    setSubmittedEntry(null);
    setActivePanel("plan");
    setNote(entry.note ?? "");
    setNotice("正在修改一条已提交记录，保存后所有人都会看到新结果。");
    setPlannedDishes(
      sortItemsByDay(entry.items).map((item, index) => ({
        id: `${entry.id}-${item.recipeId}-${item.day}-${index}`,
        recipeId: item.recipeId,
        day: item.day
      }))
    );
  }

  async function deleteHistory(entryId: string) {
    const confirmed = window.confirm("确定删除这条历史菜单吗？删除后其他人也看不到。");

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setNotice("");

    try {
      const data = await saveHistory("DELETE", { id: entryId });
      setHistoryEntries(data.historyEntries);

      if (editingEntryId === entryId) {
        clearPlan();
      }

      setNotice("历史记录已删除。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "删除失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitPlan() {
    if (plannedDishes.length === 0) {
      return;
    }

    const items = plannedDishes.map((item) => ({
      recipeId: item.recipeId,
      day: item.day
    }));
    const submissionNote = note.trim();

    setIsSaving(true);
    setNotice("");

    try {
      const data = editingEntryId
        ? await saveHistory("PUT", { id: editingEntryId, items, note: submissionNote })
        : await saveHistory("POST", { items, note: submissionNote });

      setHistoryEntries(data.historyEntries);
      setSubmittedEntry(data.entry ?? null);
      setPlannedDishes([]);
      setEditingEntryId(null);
      setNote("");
      setNotice(editingEntryId ? "修改已保存，其他人刷新后也能看到。" : "提交成功，其他人也可以查看。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "提交失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-3 pb-8 pt-3 text-ink sm:px-6 lg:py-8">
      <header className="sticky top-0 z-20 -mx-3 mb-4 border-b border-line bg-white/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:border-b-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-leaf">A Menu</p>
            <h1 className="text-2xl font-bold leading-tight sm:text-4xl">本周菜单</h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setActivePanel("history")}
              className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-bold text-slate-700 shadow-soft"
            >
              历史
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("plan")}
              className="h-10 rounded-lg bg-ink px-3 text-sm font-bold text-white shadow-soft"
            >
              待提交 {plannedDishes.length}
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          点开菜品图片查看食材，再安排到本周菜单。
        </p>
      </header>

      {notice ? (
        <p className="mb-3 rounded-lg border border-line bg-white p-3 text-sm font-medium text-slate-700 shadow-soft">
          {notice}
        </p>
      ) : null}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="菜品分类">
        {categories.map((category) => {
          const isActive = category === activeCategory;

          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`h-10 shrink-0 rounded-lg border px-4 text-sm font-semibold transition ${
                isActive
                  ? "border-leaf bg-leaf text-white"
                  : "border-line bg-white text-slate-700 hover:border-leaf hover:text-leaf"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <section className="grid grid-cols-3 gap-2 min-[600px]:grid-cols-6 sm:gap-3">
        {paginatedRecipes.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            onClick={() => setSelectedRecipeId(recipe.id)}
            className="overflow-hidden rounded-lg border border-line bg-white text-left shadow-soft transition hover:border-leaf"
          >
            <div className="relative h-20 bg-slate-100 sm:h-32 lg:h-36">
              <img src={recipe.image} alt={recipe.name} className="h-full w-full object-cover" />
              <span
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-white/95 text-sm shadow-soft sm:right-2 sm:top-2 sm:h-8 sm:w-8 sm:rounded-lg sm:text-base"
                title={weatherLabels[recipe.weather]}
                aria-label={weatherLabels[recipe.weather]}
              >
                {weatherSymbols[recipe.weather]}
              </span>
            </div>
            <div className="grid gap-1 p-2 sm:p-3">
              <h2 className="text-xs font-bold leading-snug sm:text-base">{recipe.name}</h2>
              <p className="text-xs font-medium text-slate-500">
                上次食用：{formatRelativeTime(lastEatenByRecipe[recipe.id])}
              </p>
              {plannedDaysByRecipe[recipe.id]?.length ? (
                <p className="rounded-md bg-leaf/10 px-1.5 py-1 text-xs font-bold text-leaf">
                  已选：{plannedDaysByRecipe[recipe.id].map((day) => weekdayLabels[day]).join("、")}
                </p>
              ) : null}
            </div>
          </button>
        ))}
      </section>

      {pageCount > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label="菜品分页">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-sm font-semibold text-slate-600">
            {currentPage} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
            disabled={currentPage === pageCount}
            className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一页
          </button>
        </nav>
      ) : null}

      {selectedRecipe ? (
        <div className="fixed inset-0 z-40 bg-ink/45 px-3 py-4" role="dialog" aria-modal="true">
          <div className="mx-auto grid max-h-full max-w-md overflow-hidden rounded-lg bg-white shadow-soft">
            <div className="relative h-40 bg-slate-100 sm:h-52">
              <img
                src={selectedRecipe.image}
                alt={selectedRecipe.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSelectedRecipeId(null)}
                className="absolute right-3 top-3 h-9 rounded-lg bg-white px-3 text-sm font-bold text-slate-700 shadow-soft"
              >
                关闭
              </button>
            </div>
            <div className="grid max-h-[calc(100vh-14rem)] gap-4 overflow-y-auto p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-berry">
                  {selectedRecipe.category}
                </p>
                <h2 className="mt-1 text-2xl font-bold">{selectedRecipe.name}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  上次食用：{formatRelativeTime(lastEatenByRecipe[selectedRecipe.id])}
                </p>
              </div>

              <section>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">菜品标签</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-line bg-white px-2.5 py-1 text-sm font-semibold text-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">所需食材</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipe.ingredients.map((ingredient) => (
                    <span
                      key={ingredient}
                      className="rounded-lg border border-line bg-slate-50 px-2.5 py-1 text-sm font-medium text-slate-700"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </section>

              <section className="grid gap-2">
                <label
                  className="text-sm font-bold uppercase tracking-wide"
                  htmlFor={`${selectedRecipe.id}-detail-day`}
                >
                  食用日期
                </label>
                <select
                  id={`${selectedRecipe.id}-detail-day`}
                  value={selectedDayByRecipe[selectedRecipe.id] ?? "monday"}
                  onChange={(event) =>
                    setSelectedDayByRecipe((current) => ({
                      ...current,
                      [selectedRecipe.id]: event.target.value as WeekdayId
                    }))
                  }
                  className="h-11 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-slate-700"
                >
                  {weekdays.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </section>

              <button
                type="button"
                onClick={() => addRecipeToPlan(selectedRecipe.id)}
                className="h-12 rounded-lg bg-leaf px-4 text-sm font-bold text-white transition hover:bg-leaf/90"
              >
                加入本周菜单
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activePanel ? (
        <div className="fixed inset-0 z-30 bg-ink/45" role="dialog" aria-modal="true">
          <aside className="ml-auto grid h-full w-full max-w-md grid-rows-[auto_1fr] bg-white shadow-soft">
            <div className="flex items-center justify-between gap-3 border-b border-line p-4">
              <div>
                <h2 className="text-xl font-bold">
                  {activePanel === "plan"
                    ? editingEntryId
                      ? "修改历史菜单"
                      : "待提交菜单"
                    : "历史菜谱"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {activePanel === "plan" ? "按周一到周日整理" : "所有人提交的记录"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="h-10 rounded-lg border border-line px-3 text-sm font-bold text-slate-700"
              >
                关闭
              </button>
            </div>

            {activePanel === "plan" ? (
              <div className="grid content-start gap-5 overflow-y-auto p-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={clearPlan}
                    disabled={plannedDishes.length === 0 && !editingEntryId}
                    className="h-10 rounded-lg border border-line px-3 text-sm font-semibold text-slate-600 transition hover:border-berry hover:text-berry disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {editingEntryId ? "取消修改" : "清空"}
                  </button>
                  <button
                    type="button"
                    onClick={submitPlan}
                    disabled={plannedDishes.length === 0 || isSaving}
                    className="h-10 rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSaving ? "保存中..." : editingEntryId ? "保存更改" : "Submit"}
                  </button>
                </div>

                <section aria-labelledby="selected-dishes-title">
                  <h3 id="selected-dishes-title" className="mb-3 text-sm font-bold uppercase tracking-wide">
                    已选菜品
                  </h3>
                  {plannedDishes.length > 0 ? (
                    <div className="grid gap-3">
                      {plannedByDay.map((day) =>
                        day.items.length > 0 ? (
                          <div key={day.id}>
                            <p className="mb-2 text-xs font-bold text-leaf">{day.label}</p>
                            <ul className="grid gap-2">
                              {day.items.map((item) => {
                                const recipe = recipesById[item.recipeId];

                                return (
                                  <li key={item.id} className="grid gap-2 rounded-lg bg-slate-50 px-3 py-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="min-w-0 text-sm font-medium">{recipe?.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => removePlannedDish(item.id)}
                                        className="h-8 rounded-lg border border-line bg-white px-2.5 text-xs font-bold text-slate-500 transition hover:border-berry hover:text-berry"
                                        aria-label={`删除${recipe?.name}`}
                                      >
                                        删除
                                      </button>
                                    </div>
                                    <select
                                      value={item.day}
                                      onChange={(event) =>
                                        updatePlannedDishDay(item.id, event.target.value as WeekdayId)
                                      }
                                      className="h-9 rounded-lg border border-line bg-white px-2 text-sm font-semibold text-slate-700"
                                      aria-label={`修改${recipe?.name}的食用日期`}
                                    >
                                      {weekdays.map((weekday) => (
                                        <option key={weekday.id} value={weekday.id}>
                                          {weekday.label}
                                        </option>
                                      ))}
                                    </select>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : null
                      )}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                      还没有加入菜品。
                    </p>
                  )}
                </section>

                <section aria-labelledby="ingredient-summary-title">
                  <h3
                    id="ingredient-summary-title"
                    className="mb-3 text-sm font-bold uppercase tracking-wide"
                  >
                    食材汇总
                  </h3>
                  {ingredientSummary.length > 0 ? (
                    <ul className="grid gap-2">
                      {ingredientSummary.map((ingredient) => (
                        <li
                          key={ingredient.name}
                          className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-b-0 last:pb-0"
                        >
                          <span className="text-sm font-medium">{ingredient.name}</span>
                          <span className="rounded-lg bg-sun/15 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {ingredient.count} 道菜用到
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                      加入菜品后会自动统计食材。
                    </p>
                  )}
                </section>

                <section aria-labelledby="menu-note-title" className="grid gap-2">
                  <h3 id="menu-note-title" className="text-sm font-bold uppercase tracking-wide">
                    备注
                  </h3>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="例如：少辣、有人不吃香菜、周三要简单一点"
                    className="min-h-24 resize-none rounded-lg border border-line bg-white p-3 text-sm leading-6 text-slate-700"
                  />
                </section>

                {submittedEntry ? (
                  <section className="rounded-lg border border-leaf bg-white p-4 shadow-soft">
                    <h3 className="text-lg font-bold text-leaf">最终结果</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      已保存 {submittedEntry.items.length} 道菜，所有访问者都可以查看。
                    </p>
                    <div className="mt-4 grid gap-3">
                      <h4 className="text-sm font-bold uppercase tracking-wide text-slate-600">
                        本次采购清单
                      </h4>
                      {submittedShoppingList.map((group) => (
                        <div key={group.category} className="rounded-lg bg-slate-50 p-3">
                          <p className="mb-2 text-sm font-bold text-leaf">{group.category}</p>
                          <ul className="grid gap-1">
                            {group.ingredients.map((ingredient) => (
                              <li
                                key={ingredient.name}
                                className="flex items-center justify-between gap-3 text-sm text-slate-700"
                              >
                                <span>{ingredient.name}</span>
                                <span className="font-semibold">{ingredient.count} 道菜用到</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 border-t border-line pt-4">
                      <h4 className="text-sm font-bold uppercase tracking-wide text-slate-600">
                        备注
                      </h4>
                      <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                        {submittedEntry.note?.trim() ? submittedEntry.note : "无备注"}
                      </p>
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <div className="grid content-start gap-3 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter("all")}
                    className={`h-10 rounded-lg border text-sm font-semibold ${
                      historyFilter === "all"
                        ? "border-leaf bg-leaf text-white"
                        : "border-line bg-white text-slate-700"
                    }`}
                  >
                    全部
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter("last-week")}
                    className={`h-10 rounded-lg border text-sm font-semibold ${
                      historyFilter === "last-week"
                        ? "border-leaf bg-leaf text-white"
                        : "border-line bg-white text-slate-700"
                    }`}
                  >
                    上周
                  </button>
                </div>

                {isLoadingHistory ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">读取中...</p>
                ) : null}

                {visibleHistory.length > 0 ? (
                  visibleHistory.map((entry) => (
                    <article key={entry.id} className="rounded-lg bg-slate-50 p-3">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-500">
                            {formatDateTime(entry.submittedAt)}
                          </p>
                          {entry.updatedAt && entry.updatedAt !== entry.submittedAt ? (
                            <p className="mt-1 text-xs text-slate-500">
                              更新：{formatDateTime(entry.updatedAt)}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => editHistory(entry)}
                            className="h-8 rounded-lg border border-line bg-white px-2.5 text-xs font-bold text-slate-600 hover:border-leaf hover:text-leaf"
                          >
                            修改
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteHistory(entry.id)}
                            disabled={isSaving}
                            className="h-8 rounded-lg border border-line bg-white px-2.5 text-xs font-bold text-slate-600 hover:border-berry hover:text-berry disabled:opacity-40"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <ul className="grid gap-1">
                        {sortItemsByDay(entry.items).map((item, index) => (
                          <li key={`${entry.id}-${item.recipeId}-${index}`} className="text-sm text-slate-700">
                            {weekdayLabels[item.day]} · {item.recipeName}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))
                ) : (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {historyFilter === "last-week" ? "还没有上周记录。" : "提交后会在这里看到共享历史菜单。"}
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </main>
  );
}
