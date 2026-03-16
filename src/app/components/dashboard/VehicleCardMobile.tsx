"use client";

import { driveThumbnailUrl, extractDriveFileId } from "@/lib/drive";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface VehicleCardMobileProps {
  vehicle: Vehicle;
  index: number;
  isAdmin: boolean;
  disableImages?: boolean;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  key?: React.Key;
}



export default function VehicleCardMobile({
  vehicle,
  index,
  isAdmin,
  disableImages = false,
  onEdit,
  onDelete,
}: VehicleCardMobileProps) {

  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const vehicleId = vehicle.VehicleId;
  const derived = derivePrices(vehicle.PriceNew);
  const price40 = vehicle.Price40 ?? derived.Price40;
  const price70 = vehicle.Price70 ?? derived.Price70;

  // Check if it's a Cloudinary URL first (guard against "undefined" string)
  const isCloudinary = typeof vehicle.Image === 'string' && 
    vehicle.Image !== 'undefined' && 
    vehicle.Image !== 'null' &&
    vehicle.Image.includes('res.cloudinary.com');
  
  // Extract Google Drive file ID if not Cloudinary
  const imageFileId = !isCloudinary ? extractDriveFileId(vehicle.Image) : null;
  
  const thumbUrl = useMemo(() => {
    if (disableImages) return null;
    
    if (isCloudinary) {
      // Use Cloudinary URL directly
      return vehicle.Image;
    }
    
    // Try Google Drive
    if (!imageFileId || imageError) return null;
    return `${driveThumbnailUrl(imageFileId, "w300-h300")}`;
  }, [disableImages, isCloudinary, vehicle.Image, imageFileId, imageError]);

  const formatPrice = (price: number | null) => {
    if (price == null) return "-";
    return `$${price.toLocaleString()}`;
  };

  return (
    <div
      className={`lg:hidden rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 ${
        index % 2 === 0
          ? "bg-white/80 dark:bg-gray-800/80"
          : "bg-gray-50/80 dark:bg-gray-800/60"
      }`}
    >
      {/* Main Card Content */}
      <div
        className="p-4 flex gap-4 cursor-pointer active:scale-[0.99] transition-transform"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Image */}
        <div className="flex-shrink-0">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={`${vehicle.Brand} ${vehicle.Model}`}
              className="h-20 w-20 rounded-xl object-cover ring-1 ring-black/10 bg-white"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="h-20 w-20 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-1 ring-black/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
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
                {vehicle.Brand} {vehicle.Model}
              </h3>
              <p className="text-sm text-gray-500 dark:text-white">
                {vehicle.Year || "-"} • {vehicle.Category}
              </p>
            </div>
            <span
              className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                vehicle.Condition === "New"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : vehicle.Condition === "Used"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {vehicle.Condition || "Unknown"}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatPrice(vehicle.PriceNew)}
            </div>
            <div className="flex items-center text-gray-400 dark:text-white">
              <span className="text-xs mr-1">{expanded ? "Less" : "More"}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          <div className="pt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-white">Vehicle ID:</span>
              <p className="font-mono text-gray-900 dark:text-white">{vehicle.VehicleId || "-"}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-white">Plate:</span>
              <p className="font-mono text-gray-900 dark:text-white">{vehicle.Plate || "-"}</p>
            </div>

            <div>
              <span className="text-gray-500 dark:text-white">Tax Type:</span>
              <p className="text-gray-900 dark:text-white">{vehicle.TaxType || "-"}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-white">Body Type:</span>
              <p className="text-gray-900 dark:text-white">{vehicle.BodyType || "-"}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-white">Color:</span>
              <p className="text-gray-900 dark:text-white">{vehicle.Color || "-"}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-white">D.O.C. 40%:</span>
              <p className="font-semibold text-orange-600 dark:text-orange-400">
                {formatPrice(price40)}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-white">Vehicles 70%:</span>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatPrice(price70)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/35 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/30 rounded-xl font-medium active:scale-[0.98] transition-transform touch-target"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit ? onEdit(vehicle) : router.push(`/vehicles/${encodeURIComponent(vehicleId)}/edit`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl font-medium active:scale-[0.98] transition-transform touch-target"
                >

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4"
                  >
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => onDelete(vehicle)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-medium active:scale-[0.98] transition-transform touch-target"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
