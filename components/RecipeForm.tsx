"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { weatherLabels, weatherSymbols, type WeatherSuitability } from "@/data/recipes";
import { ingredientCategories, normalizeRecipeInput } from "@/lib/recipe-input.mjs";

type Props = {
  categories: string[];
  onClose: () => void;
  onCreate: (input: unknown) => Promise<void>;
};

export function RecipeForm({ categories, onClose, onCreate }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nextId = useRef(1);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "家常菜");
  const [tags, setTags] = useState("");
  const [weather, setWeather] = useState<WeatherSuitability>("both");
  const [image, setImage] = useState("");
  const [ingredients, setIngredients] = useState([{ id: 0, name: "", category: "蔬菜" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const names = ingredients.map((item) => item.name.trim());
      const input = {
        name, category, weather, image,
        tags: tags.split(/[,，、\n]/).map((tag) => tag.trim()).filter(Boolean),
        ingredients: names,
        ingredientTypes: Object.fromEntries(ingredients.map((item) => [item.name.trim(), item.category]))
      };
      normalizeRecipeInput(input);
      await onCreate(input);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "添加失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "min-h-11 min-w-0 w-full rounded-lg border border-line bg-white px-3 py-2 text-base font-normal text-ink";
  return (
    <dialog ref={dialog} aria-labelledby="new-recipe-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-md overflow-y-auto rounded-lg border border-line bg-white p-0 text-ink shadow-soft backdrop:bg-black/40">
      <form onSubmit={submit}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white p-4">
          <h2 id="new-recipe-title" className="text-xl font-bold">新增菜品</h2>
          <button type="button" disabled={saving} title="关闭" aria-label="关闭" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-40"><X size={20} /></button>
        </div>
        <fieldset disabled={saving} className="grid min-w-0 gap-4 p-4 disabled:opacity-60">
          <label className="grid gap-2 text-sm font-semibold">菜品名称<input autoFocus required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
          <label className="grid gap-2 text-sm font-semibold">分类
            <input required list="recipe-categories" maxLength={30} value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} />
            <datalist id="recipe-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist>
          </label>
          <label className="grid gap-2 text-sm font-semibold">标签<input maxLength={250} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="牛肉、肉菜、微辣" className={inputClass} /></label>
          <fieldset className="grid min-w-0 gap-2">
            <legend className="mb-2 text-sm font-semibold">天气适合度</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["cold", "hot", "both"] as const).map((value) => (
                <label key={value} className={`flex min-h-11 items-center justify-center gap-1 rounded-lg border p-1 text-xs ${weather === value ? "border-leaf bg-leaf/10" : "border-line"}`}>
                  <input type="radio" name="weather" value={value} checked={weather === value} onChange={() => setWeather(value)} className="accent-leaf" />
                  <span title={weatherLabels[value]}>{weatherSymbols[value]}</span><span>{value === "cold" ? "冷天" : value === "hot" ? "热天" : "都适合"}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-2 text-sm font-semibold">图片网址（选填）<input type="url" maxLength={2048} value={image} onChange={(event) => setImage(event.target.value)} placeholder="https://…" className={inputClass} /></label>
          <section className="grid min-w-0 gap-2" aria-labelledby="new-ingredients-title">
            <div className="flex items-center justify-between gap-2">
              <h3 id="new-ingredients-title" className="text-sm font-semibold">所需食材</h3>
              <button type="button" disabled={ingredients.length >= 60} onClick={() => setIngredients((items) => [...items, { id: nextId.current++, name: "", category: "蔬菜" }])} className="flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-leaf disabled:opacity-40"><Plus size={18} />添加食材</button>
            </div>
            {ingredients.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.75rem] gap-2">
                <input aria-label={`食材 ${index + 1} 名称`} required maxLength={40} value={item.name} onChange={(event) => setIngredients((items) => items.map((current) => current.id === item.id ? { ...current, name: event.target.value } : current))} placeholder="食材名称" className={inputClass} />
                <select aria-label={`食材 ${index + 1} 类别`} value={item.category} onChange={(event) => setIngredients((items) => items.map((current) => current.id === item.id ? { ...current, category: event.target.value } : current))} className="min-w-0 rounded-lg border border-line bg-white px-1 text-base">{ingredientCategories.map((value) => <option key={value}>{value}</option>)}</select>
                <button type="button" title="删除食材" aria-label={`删除食材 ${index + 1}`} disabled={ingredients.length === 1} onClick={() => setIngredients((items) => items.filter((current) => current.id !== item.id))} className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"><Trash2 size={18} /></button>
              </div>
            ))}
          </section>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <button type="submit" className="min-h-12 rounded-lg bg-leaf px-4 text-sm font-bold text-white">{saving ? "保存中..." : "保存菜品"}</button>
        </fieldset>
      </form>
    </dialog>
  );
}
