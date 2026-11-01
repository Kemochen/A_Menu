const labels = { recipes: "菜品库", history: "历史菜单" };

export class MenuApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "MenuApiError";
    this.status = status;
  }
}

function statusError(resource, status) {
  if (status === 404) {
    return resource === "recipes"
      ? "群晖缺少菜品库接口（HTTP 404）。请更新群晖菜单服务；只更新 App 不会更新服务器。"
      : "找不到历史菜单接口（HTTP 404），请检查服务器地址和群晖菜单服务版本。";
  }
  if (status === 401 || status === 403) {
    return `群晖拒绝访问（HTTP ${status}），请检查菜单服务的访问权限或反向代理登录设置。`;
  }
  return `${labels[resource]}请求失败（HTTP ${status}），请检查群晖菜单服务后重试。`;
}

export async function readApiResponse(response, resource) {
  const status = response.status;
  // Older NAS deployments return an HTML 404 page for the new recipes endpoint.
  if (status === 404 || status === 401 || status === 403) {
    throw new MenuApiError(statusError(resource, status), status);
  }

  let body;
  try {
    body = await response.text();
  } catch {
    throw new MenuApiError("读取服务器响应失败，请检查网络连接后重试。", status);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    const message = response.ok
      ? `群晖返回的不是有效的${labels[resource]}数据。请确认网址指向菜单服务，并更新群晖菜单服务。`
      : statusError(resource, status);
    throw new MenuApiError(message, status);
  }

  if (!response.ok) {
    const message = typeof data?.error === "string" && data.error.trim()
      ? data.error.trim().slice(0, 500) : statusError(resource, status);
    throw new MenuApiError(message, status);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new MenuApiError(`服务器返回的${labels[resource]}格式不正确，请更新群晖菜单服务。`, status);
  }
  return data;
}

export async function requestApiJson(url, resource, options = {}) {
  let response;
  try {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new MenuApiError("无法连接群晖菜单服务，请检查网址、Wi-Fi、VPN 或局域网访问权限。");
  }
  return readApiResponse(response, resource);
}
