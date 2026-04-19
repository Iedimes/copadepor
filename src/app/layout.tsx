import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CopaDepor - Gestión de Torneos Deportivos",
  description: "Plataforma para organizar y gestionar torneos deportivos de manera profesional",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CopaDepor",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} h-full bg-gray-50`}>{children}</body>
    </html>
  );
}