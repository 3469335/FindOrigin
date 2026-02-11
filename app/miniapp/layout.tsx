import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "FindOrigin",
  description: "AI-анализ источников",
};

export default function MiniappLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
