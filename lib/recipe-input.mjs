export const ingredientCategories = ["蔬菜", "肉类", "海鲜", "主食", "豆制品", "蛋奶", "水果", "调料", "菌菇", "其他"];

const categoryImages = {
  "肉类": "meat", "家常菜": "home-style", "素菜": "vegetable",
  "海鲜类": "seafood", "主食类": "staple", "汤类": "soup"
};

function requiredText(value, label, max) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new Error(`${label}不能为空，且不能超过 ${max} 个字。`);
  }
  return value.trim();
}

export function normalizeRecipeInput(value) {
  if (!value || typeof value !== "object") throw new Error("菜品格式不正确。");
  const name = requiredText(value.name, "菜品名称", 60);
  let category = requiredText(value.category, "分类", 30);
  if (["面类/主食类", "饭类/主食类"].includes(category)) category = "主食类";
  if (!["cold", "hot", "both"].includes(value.weather)) throw new Error("请选择天气适合度。");
  if (!Array.isArray(value.tags) || value.tags.length > 12) throw new Error("标签最多 12 个。");
  const tags = [...new Set(value.tags.map((tag) => requiredText(tag, "标签", 20)))];
  if (!Array.isArray(value.ingredients) || !value.ingredients.length || value.ingredients.length > 60) {
    throw new Error("请填写 1 到 60 种食材。");
  }
  const ingredients = [...new Set(value.ingredients.map((item) => requiredText(item, "食材名称", 40)))];
  const ingredientTypes = Object.fromEntries(ingredients.map((name) => {
    const type = value.ingredientTypes?.[name];
    if (!ingredientCategories.includes(type)) throw new Error(`请选择“${name}”的食材类别。`);
    return [name, type];
  }));
  let image = `/dishes/categories/${categoryImages[category] ?? "home-style"}.svg`;
  if (value.image !== undefined && value.image !== "") {
    if (typeof value.image !== "string" || value.image.length > 2048) throw new Error("图片网址不正确。");
    let url;
    try { url = new URL(value.image.trim()); } catch { throw new Error("请填写完整的 HTTP 或 HTTPS 图片网址。"); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("图片网址不正确。");
    image = url.href;
  }
  return { name, category, tags, weather: value.weather, image, ingredients, ingredientTypes };
}
