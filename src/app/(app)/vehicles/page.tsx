"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { NeuVehicleListSkeleton } from "@/app/components/skeletons/NeuVehicleListSkeleton";

// Lazy load the enhanced client component with proper skeleton
const VehiclesClientEnhanced = dynamic(() => import("./VehiclesClientEnhanced"), {
  loading: () => <NeuVehicleListSkeleton />,
  ssr: false,
});

export default function VehiclesPage() {
  return (
    <Suspense fallback={<NeuVehicleListSkeleton />}>
      <VehiclesClientEnhanced />
    </Suspense>
  );
}
