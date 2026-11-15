import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/bebas-neue";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MovieHub — Watch free, legal movies", template: "%s · MovieHub" },
  description:
    "Stream openly licensed and public-domain films in a fast, modern player. Embed the player on your own site.",
};

export const viewport: Viewport = {
  themeColor: "#090b10",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
