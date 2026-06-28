"use client";

import { useEffect, useMemo, useState } from "react";
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

type HistoryEntry = {
  id: string;
  submittedAt: string;
  items: HistoryItem[];
  ingredientSummary: IngredientUse[];
};

type MenuAppProps = {
  recipes: Recipe[];
};

const allCategory = "全部";
const planStorageKey = "a-menu-current-plan";
const historyStorageKey = "a-menu-history";
const lastEatenStorageKey = "a-menu-last-eaten";

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

function getInitialLastEaten(recipes: Recipe[]) {
  const today = new Date();

  return Object.fromEntries(
    recipes
      .filter((recipe) => recipe.initialLastEatenDaysAgo)
      .map((recipe) => {
        const date = new Date(today);
        date.setDate(today.getDate() - Number(recipe.initialLastEatenDaysAgo));

        return [recipe.id, date.toISOString()];
      })
  );
}

function getStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setStoredValue<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
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

export function MenuApp({ recipes }: MenuAppProps) {
  const [activeCategory, setActiveCategory] = useState(allCategory);
  const [plannedDishes, setPlannedDishes] = useState<PlannedDish[]>([]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [lastEatenByRecipe, setLastEatenByRecipe] = useState<Record<string, string>>({});
  const [selectedDayByRecipe, setSelectedDayByRecipe] = useState<Record<string, WeekdayId>>({});
  const [historyFilter, setHistoryFilter] = useState<"all" | "last-week">("all");
  const [submittedEntry, setSubmittedEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    setPlannedDishes(getStoredValue<PlannedDish[]>(planStorageKey, []));
    setHistoryEntries(getStoredValue<HistoryEntry[]>(historyStorageKey, []));
    setLastEatenByRecipe(
      getStoredValue<Record<string, string>>(lastEatenStorageKey, getInitialLastEaten(recipes))
    );
  }, [recipes]);

  const recipesById = useMemo(
    () => Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe])) as Record<string, Recipe>,
    [recipes]
  );

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

  const ingredientSummary = useMemo(
    () => summarizeIngredients(plannedDishes, recipes),
    [plannedDishes, recipes]
  );

  const plannedByDay = useMemo(() => {
    return weekdays.map((day) => ({
      ...day,
      items: plannedDishes.filter((item) => item.day === day.id)
    }));
  }, [plannedDishes]);

  const visibleHistory = useMemo(
    () =>
      historyFilter === "last-week"
        ? historyEntries.filter((entry) => isLastWeek(entry.submittedAt))
        : historyEntries,
    [historyEntries, historyFilter]
  );

  function updatePlan(nextPlan: PlannedDish[]) {
    setPlannedDishes(nextPlan);
    setStoredValue(planStorageKey, nextPlan);
  }

  function addRecipeToPlan(recipeId: string) {
    const day = selectedDayByRecipe[recipeId] ?? "monday";
    const alreadyPlanned = plannedDishes.some(
      (item) => item.recipeId === recipeId && item.day === day
    );

    if (alreadyPlanned) {
      return;
    }

    updatePlan([
      ...plannedDishes,
      {
        id: `${recipeId}-${day}-${Date.now()}`,
        recipeId,
        day
      }
    ]);
    setSubmittedEntry(null);
  }

  function removePlannedDish(itemId: string) {
    updatePlan(plannedDishes.filter((item) => item.id !== itemId));
    setSubmittedEntry(null);
  }

  function clearPlan() {
    updatePlan([]);
    setSubmittedEntry(null);
  }

  function submitPlan() {
    if (plannedDishes.length === 0) {
      return;
    }

    const submittedAt = new Date().toISOString();
    const items = plannedDishes.map((item) => {
      const recipe = recipesById[item.recipeId];

      return {
        recipeId: item.recipeId,
        recipeName: recipe?.name ?? "未知菜品",
        day: item.day
      };
    });
    const newEntry: HistoryEntry = {
      id: `history-${Date.now()}`,
      submittedAt,
      items,
      ingredientSummary
    };
    const nextHistory = [newEntry, ...historyEntries];
    const nextLastEaten = { ...lastEatenByRecipe };

    for (const item of plannedDishes) {
      nextLastEaten[item.recipeId] = submittedAt;
    }

    setHistoryEntries(nextHistory);
    setLastEatenByRecipe(nextLastEaten);
    setSubmittedEntry(newEntry);
    setStoredValue(historyStorageKey, nextHistory);
    setStoredValue(lastEatenStorageKey, nextLastEaten);
    updatePlan([]);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-4 text-ink sm:px-6 lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 lg:py-8">
      <section className="min-w-0">
        <header className="mb-4">
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-leaf">A Menu</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">本周菜单</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                选择菜品时先选周几食用，加入菜单后统一提交保存。
              </p>
            </div>
            <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-soft">
              已加入 <span className="font-semibold">{plannedDishes.length}</span> 道菜
            </div>
          </div>
        </header>

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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRecipes.map((recipe) => {
            const selectedDay = selectedDayByRecipe[recipe.id] ?? "monday";
            const alreadyPlannedForDay = plannedDishes.some(
              (item) => item.recipeId === recipe.id && item.day === selectedDay
            );

            return (
              <article key={recipe.id} className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <img src={recipe.image} alt={recipe.name} className="h-full w-full object-cover" />
                  <span
                    className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-lg bg-white/95 text-xl shadow-soft"
                    title={weatherLabels[recipe.weather]}
                    aria-label={weatherLabels[recipe.weather]}
                  >
                    {weatherSymbols[recipe.weather]}
                  </span>
                </div>

                <div className="grid gap-3 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-berry">
                      {recipe.category}
                    </p>
                    <h2 className="mt-1 text-lg font-bold leading-snug">{recipe.name}</h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      上次食用：{formatRelativeTime(lastEatenByRecipe[recipe.id])}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg border border-line bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor={`${recipe.id}-day`}>
                      食用日期
                    </label>
                    <select
                      id={`${recipe.id}-day`}
                      value={selectedDay}
                      onChange={(event) =>
                        setSelectedDayByRecipe((current) => ({
                          ...current,
                          [recipe.id]: event.target.value as WeekdayId
                        }))
                      }
                      className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-slate-700"
                    >
                      {weekdays.map((day) => (
                        <option key={day.id} value={day.id}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => addRecipeToPlan(recipe.id)}
                    disabled={alreadyPlannedForDay}
                    className="h-11 rounded-lg bg-leaf px-4 text-sm font-bold text-white transition hover:bg-leaf/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {alreadyPlannedForDay ? `已加入${weekdayLabels[selectedDay]}` : "加入本周菜单"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="grid gap-4 lg:sticky lg:top-6 lg:h-fit">
        <section className="rounded-lg border border-line bg-white shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b border-line p-4">
            <div>
              <h2 className="text-xl font-bold">待提交菜单</h2>
              <p className="mt-1 text-sm text-slate-600">按周一到周日整理</p>
            </div>
            <button
              type="button"
              onClick={clearPlan}
              disabled={plannedDishes.length === 0}
              className="h-10 rounded-lg border border-line px-3 text-sm font-semibold text-slate-600 transition hover:border-berry hover:text-berry disabled:cursor-not-allowed disabled:opacity-40"
            >
              清空
            </button>
          </div>

          <div className="grid gap-5 p-4">
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
                              <li
                                key={item.id}
                                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                              >
                                <span className="min-w-0 text-sm font-medium">{recipe?.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removePlannedDish(item.id)}
                                  className="h-8 w-8 shrink-0 rounded-lg border border-line bg-white text-slate-500 transition hover:border-berry hover:text-berry"
                                  aria-label={`移除${recipe?.name}`}
                                >
                                  ×
                                </button>
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

            <button
              type="button"
              onClick={submitPlan}
              disabled={plannedDishes.length === 0}
              className="h-12 rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Submit 提交最终菜单
            </button>
          </div>
        </section>

        {submittedEntry ? (
          <section className="rounded-lg border border-leaf bg-white p-4 shadow-soft">
            <h2 className="text-lg font-bold text-leaf">最终结果</h2>
            <p className="mt-1 text-sm text-slate-600">
              已提交 {submittedEntry.items.length} 道菜，并刷新上次食用时间。
            </p>
            <div className="mt-4 grid gap-4">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  提交菜品
                </h3>
                <ul className="grid gap-1">
                  {submittedEntry.items.map((item, index) => (
                    <li key={`${submittedEntry.id}-result-${index}`} className="text-sm text-slate-700">
                      {weekdayLabels[item.day]} · {item.recipeName}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  食材汇总
                </h3>
                <ul className="grid gap-1">
                  {submittedEntry.ingredientSummary.map((ingredient) => (
                    <li key={`${submittedEntry.id}-${ingredient.name}`} className="text-sm text-slate-700">
                      {ingredient.name}：{ingredient.count} 道菜用到
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-line bg-white shadow-soft">
          <div className="border-b border-line p-4">
            <h2 className="text-xl font-bold">历史菜谱</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
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
          </div>

          <div className="grid gap-3 p-4">
            {visibleHistory.length > 0 ? (
              visibleHistory.map((entry) => (
                <article key={entry.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-bold text-slate-500">
                    {formatDateTime(entry.submittedAt)}
                  </p>
                  <ul className="grid gap-1">
                    {entry.items.map((item, index) => (
                      <li key={`${entry.id}-${item.recipeId}-${index}`} className="text-sm text-slate-700">
                        {weekdayLabels[item.day]} · {item.recipeName}
                      </li>
                    ))}
                  </ul>
                </article>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {historyFilter === "last-week" ? "还没有上周记录。" : "提交后会在这里看到历史菜单。"}
              </p>
            )}
          </div>
        </section>
      </aside>
    </main>
  );
}
