"use client";

import { SessionProvider } from "next-auth/react";

const SessionProviderWrapper = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

export { SessionProviderWrapper };
