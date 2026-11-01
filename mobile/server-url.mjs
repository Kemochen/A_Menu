export const serverStorageKey = "a-menu.server-url";

function isLocalHttpHost(hostname) {
  if (hostname.startsWith("[")) {
    const prefix = Number.parseInt(hostname.slice(1).split(":")[0], 16);
    return (prefix >= 0xfc00 && prefix <= 0xfdff) || (prefix >= 0xfe80 && prefix <= 0xfebf);
  }

  // URL has already validated and normalized numeric hosts, including non-decimal IPv4 input.
  const octets = hostname.split(".").map(Number);
  if (octets.length === 4 && octets.every(Number.isInteger)) {
    const [first, second] = octets;
    return first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 100 && second >= 64 && second <= 127);
  }

  return hostname.endsWith(".local") || /^[a-z][a-z0-9-]*$/i.test(hostname);
}

export function normalizeServerUrl(value) {
  let url;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("请输入完整的 HTTP 或 HTTPS 网址。");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("服务器网址只支持 HTTP 或 HTTPS。");
  }

  if (url.hostname === "localhost" || url.hostname === "[::1]" || url.hostname.startsWith("127.")) {
    throw new Error("请填写群晖的内网地址，localhost 指向手机自己。");
  }

  if (url.protocol === "http:" && !isLocalHttpHost(url.hostname)) {
    throw new Error("HTTP 仅支持内网 IP、VPN IP 或本地主机名；公网地址请使用 HTTPS。");
  }

  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("请填写服务器根网址，不要包含路径、账号或参数。");
  }

  return url.origin;
}
