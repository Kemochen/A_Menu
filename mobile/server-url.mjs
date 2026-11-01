export const serverStorageKey = "a-menu.server-url";

export function normalizeServerUrl(value) {
  let url;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("请输入完整的 HTTPS 网址。");
  }

  if (url.protocol !== "https:") {
    throw new Error("服务器需要使用 HTTPS。");
  }

  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("请填写服务器根网址，不要包含路径、账号或参数。");
  }

  return url.origin;
}
