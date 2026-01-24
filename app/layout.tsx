import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FindOrigin",
  description: "Поиск источников: введите текст или ссылку",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
