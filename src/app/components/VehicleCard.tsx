  "use client";

import { driveThumbnailUrl, extractDriveFileId } from "@/lib/drive";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";

import { GlassButton } from "@/app/components/ui/GlassButton";


type VehicleCardProps = {
  vehicle: Vehicle;
  index: number;
  isAdmin: boolean;
  onDelete: (vehicle: Vehicle) => void;
  searchQuery?: string;
};

export default function VehicleCard({
  vehicle,
  index,
  isAdmin,
  onDelete,
  searchQuery = "",
}: VehicleCardProps) {
  const router = useRouter();
  const vehicleId = vehicle.VehicleId;
  const displayNo = vehicleId || String(index + 1);

  const derived = derivePrices(vehicle.PriceNew);
  const price40 = vehicle.Price40 ?? derived.Price40;
  const price70 = vehicle.Price70 ?? derived.Price70;

  // Check if it's a Cloudinary URL first (guard against "undefined" string)
  const isCloudinary = vehicle.Image && 
    vehicle.Image !== 'undefined' && 
    vehicle.Image !== 'null' &&
    vehicle.Image.includes('res.cloudinary.com');
  
  // Use useMemo to avoid calling Date.now() during render (impure function)
  const thumbUrl = useMemo(() => {
    if (isCloudinary) {
      // Use Cloudinary URL directly
      return vehicle.Image;
    }
    
    // Try Google Drive
    const imageFileId = extractDriveFileId(vehicle.Image);
    return imageFileId
      ? `${driveThumbnailUrl(imageFileId, "w300-h300")}`
      : vehicle.Image;
  }, [isCloudinary, vehicle.Image]);


  const handleClick = () => {
    if (!vehicleId) return;
    router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!vehicleId) return;
    router.push(`/vehicles/${encodeURIComponent(vehicleId)}/edit`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(vehicle);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 flex gap-4 cursor-pointer transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 ${
        index % 2 === 0 ? "bg-white/50 dark:bg-gray-800/30" : "bg-gray-50/50 dark:bg-gray-800/20"
      }`}
    >
      {/* Image */}
      <div className="flex-shrink-0">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt={`${vehicle.Brand} ${vehicle.Model}`}
            loading="lazy"
            decoding="async"
            className="h-20 w-20 rounded-xl object-cover ring-1 ring-black/10 bg-white shadow-sm"
          />
        ) : (
          <div className="h-20 w-20 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-1 ring-black/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-gray-400"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {highlightText(`${vehicle.Brand} ${vehicle.Model}`, searchQuery)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {vehicle.Year || "-"} • {vehicle.Category}
            </p>
          </div>
          <span
            className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              vehicle.Condition === "New"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                : vehicle.Condition === "Used"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
            }`}
          >
            {vehicle.Condition || "Unknown"}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Plate:</span>{" "}
            <span className="font-mono text-gray-700 dark:text-gray-300">{vehicle.Plate || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Tax:</span>{" "}
            <span className="text-gray-700 dark:text-gray-300">{vehicle.TaxType || "-"}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {vehicle.PriceNew == null ? "-" : `$${vehicle.PriceNew.toLocaleString()}`}
            </span>
            {price70 != null && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                70%: ${price70.toLocaleString()}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <GlassButton
              onClick={handleClick}
              variant="ghost"
              className="!p-2 !w-auto !h-auto"
              aria-label="View"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </GlassButton>
            {isAdmin && (
              <>
                <GlassButton
                  onClick={handleEdit}
                  variant="ghost"
                  className="!p-2 !w-auto !h-auto text-blue-600"
                  aria-label="Edit"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
                  </svg>
                </GlassButton>
                <GlassButton
                  onClick={handleDelete}
                  variant="ghost"
                  className="!p-2 !w-auto !h-auto text-red-600"
                  aria-label="Delete"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </GlassButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
