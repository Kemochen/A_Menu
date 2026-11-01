import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./menu.css";

export const metadata: Metadata = {
  title: "本周菜单",
  description: "一个轻量的中文选菜和历史菜谱小应用。"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
