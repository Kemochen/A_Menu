import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Settings } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { MenuApp } from "@/components/MenuApp";
import { recipes } from "@/data/recipes";
import { normalizeServerUrl, serverStorageKey } from "./server-url.mjs";
import "@/app/globals.css";
import "./native.css";

function readSavedServer() {
  try {
    const value = localStorage.getItem(serverStorageKey);
    return value ? normalizeServerUrl(value) : "";
  } catch {
    return "";
  }
}

function MobileApp() {
  const [server, setServer] = useState(readSavedServer);
  const [serverInput, setServerInput] = useState(server);
  const [settingsOpen, setSettingsOpen] = useState(!server);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (settingsOpen) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
  }, [settingsOpen]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setConnecting(true);

    try {
      const nextServer = normalizeServerUrl(serverInput);
      if (server && server !== nextServer && !window.confirm("切换服务器会清空当前未提交菜单，是否继续？")) {
        return;
      }
      const response = await CapacitorHttp.get({
        url: `${nextServer}/api/history`,
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        connectTimeout: 15_000,
        readTimeout: 15_000,
        responseType: "json"
      });

      if (response.status !== 200 || !Array.isArray(response.data?.historyEntries)) {
        throw new Error("服务器没有返回有效的菜单记录。");
      }

      localStorage.setItem(serverStorageKey, nextServer);
      setServer(nextServer);
      setServerInput(nextServer);
      setSettingsOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "连接失败，请检查网址、VPN、局域网权限或 HTTPS 证书。");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="native-shell">
      {server ? (
        <>
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 pt-2 sm:px-6">
            <span className="truncate text-xs text-slate-500">{new URL(server).host}</span>
            <button
              type="button"
              aria-label="服务器设置"
              title="服务器设置"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink"
              onClick={() => {
                setServerInput(server);
                setError("");
                setSettingsOpen(true);
              }}
            >
              <Settings size={18} aria-hidden="true" />
            </button>
          </div>
          <MenuApp
            key={server}
            recipes={recipes}
            historyEndpoint={`${server}/api/history`}
          />
        </>
      ) : null}

      <dialog
        ref={dialog}
        aria-labelledby="server-title"
        className="server-dialog w-[calc(100%_-_2rem)] max-w-sm rounded-lg border border-line bg-white p-5 text-ink shadow-soft"
        onCancel={(event) => {
          event.preventDefault();
          if (server && !connecting) setSettingsOpen(false);
        }}
      >
        <form onSubmit={connect} className="grid gap-4">
          <h1 id="server-title" className="text-xl font-bold">连接菜单服务器</h1>
          <label className="grid gap-2 text-sm font-semibold">
            群晖网址
            <input
              type="url"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
              value={serverInput}
              onChange={(event) => setServerInput(event.target.value)}
              placeholder="http://192.168.1.111:3000"
              disabled={connecting}
              className="min-w-0 w-full rounded-lg border border-line px-3 py-3 text-base font-normal"
            />
          </label>
          {serverInput.trim().toLowerCase().startsWith("http:") ? (
            <p className="text-xs text-amber-800">HTTP 连接未加密，请仅在可信内网或 VPN 中使用。</p>
          ) : null}
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2">
            {server ? (
              <button
                type="button"
                disabled={connecting}
                onClick={() => setSettingsOpen(false)}
                className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold"
              >
                取消
              </button>
            ) : null}
            <button
              type="submit"
              disabled={connecting}
              className="min-h-11 rounded-lg bg-leaf px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              {connecting ? "连接中…" : "连接"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

const nativePreview = import.meta.env.DEV && new URLSearchParams(location.search).has("native-preview");
createRoot(document.getElementById("root")!).render(
  Capacitor.isNativePlatform() || nativePreview ? <MobileApp /> : <MenuApp recipes={recipes} />
);
