import { clearCachedVehicles } from "../_cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  // Optional: Add authentication if needed
  // For now, allow anyone to clear cache (since it's just cache invalidation)

  clearCachedVehicles();
  return NextResponse.json({ ok: true, message: "Cache cleared" });
}
