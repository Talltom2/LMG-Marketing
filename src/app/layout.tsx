import type { Metadata } from "next";
import "./globals.css";
import "./site-additions.css";

export const metadata: Metadata = {
  title: "LMG Marketing Intelligence",
  description: "Marketing command center for Laughing Moose Gifts",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
