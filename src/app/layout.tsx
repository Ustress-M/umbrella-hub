import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "우산 대여 시스템",
  description: "학교 우산 무인 대여 서비스",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="ko">
    <body className={inter.className}>
      {children}
      <Toaster />
    </body>
  </html>
);

export default RootLayout;
