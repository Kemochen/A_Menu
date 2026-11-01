import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type MenuCommand = "browse" | "history" | "plan" | "add" | "settings";
export type NativeLayout = { foldable?: boolean; division?: { x: number; width: number } };

interface NativeMenuControls {
  setState(state: { hasServer: boolean; selectedCount: number }): Promise<void>;
  getLayout(): Promise<NativeLayout>;
  addListener(event: "command", listener: (event: { action: MenuCommand }) => void): Promise<PluginListenerHandle>;
  addListener(event: "layout", listener: (event: NativeLayout) => void): Promise<PluginListenerHandle>;
}

export const nativeControlsAvailable = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("MenuControls");
export const NativeControls = registerPlugin<NativeMenuControls>("MenuControls");
