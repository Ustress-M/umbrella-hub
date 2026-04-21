import type { Umbrella, Rental, UmbrellaStatus, RentalStatus } from "@prisma/client";

export type { UmbrellaStatus, RentalStatus };

export type UmbrellaWithRentals = Umbrella & {
  rentals: Rental[];
};

export type RentalWithUmbrella = Rental & {
  umbrella: Umbrella;
};

export type StatsData = {
  totalUmbrellas: number;
  rentedCount: number;
  availableCount: number;
  todayRented: number;
  todayReturned: number;
  weeklyData: WeeklyDataPoint[];
  overdueRentals: RentalWithUmbrella[];
};

export type WeeklyDataPoint = {
  date: string;
  rented: number;
  returned: number;
};

export type ApiResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

// NextAuth 세션 타입 확장
declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }
}

// NextAuth JWT 타입 확장 (token.role 타입 안전성)
declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}
