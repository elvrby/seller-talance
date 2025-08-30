// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientShell from "./components/addons/ClientShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Seller Talance",
  description: "Seller Talance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-white text-gray-900 dark:bg-black dark:text-white`}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
