
export type Role = "Admin" | "Staff";

export type User = {
  username: string;
  role: Role;
};

// Tax type options for vehicle registration
export const TAX_TYPE_OPTIONS = [
  "Tax Paper",
  "Plate Number",
  "Standard",
  "Luxury",
  "Commercial",
] as const;

export type TaxType = (typeof TAX_TYPE_OPTIONS)[number];

// Tax Type metadata with descriptions for static data
export interface TaxTypeMetadata {
  value: TaxType;
  label: string;
  description: string;
  color: string;
}

export const TAX_TYPE_METADATA: TaxTypeMetadata[] = [
  {
    value: "Tax Paper",
    label: "Tax Paper",
    description: "Standard tax documentation",
    color: "blue",
  },
  {
    value: "Plate Number",
    label: "Plate Number",
    description: "Vehicle with license plate registration",
    color: "cyan",
  },
  {
    value: "Standard",
    label: "Standard",
    description: "Regular vehicle registration",
    color: "green",
  },
  {
    value: "Luxury",
    label: "Luxury",
    description: "High-end vehicle taxes",
    color: "purple",
  },
  {
    value: "Commercial",
    label: "Commercial",
    description: "Business/commercial vehicles",
    color: "orange",
  },
] as const;

// Color options for vehicle selection
export const COLOR_OPTIONS = [
  { value: "White", hex: "#FFFFFF" },
  { value: "Black", hex: "#000000" },
  { value: "Silver", hex: "#C0C0C0" },
  { value: "Gray", hex: "#808080" },
  { value: "Red", hex: "#FF0000" },
  { value: "Blue", hex: "#0000FF" },
  { value: "Green", hex: "#008000" },
  { value: "Yellow", hex: "#FFFF00" },
  { value: "Orange", hex: "#FFA500" },
  { value: "Brown", hex: "#A52A2A" },
  { value: "Beige", hex: "#F5F5DC" },
  { value: "Gold", hex: "#FFD700" },
  { value: "Navy", hex: "#000080" },
  { value: "Purple", hex: "#800080" },
  { value: "Pink", hex: "#FFC0CB" },
] as const;

// Plate number validation helper
export const PLATE_NUMBER_MAX_LENGTH = 20;

// Cambodia plate number format hints
export const PLATE_NUMBER_HINTS = [
  "1A-1234",
  "2B-5678",
  "AA-9999",
  "BB-1234",
];

export type Vehicle = {
  VehicleId: string;
  Category: string;
  Brand: string;
  Model: string;
  Year: number | null;
  Plate: string;
  PriceNew: number | null;
  Price40: number | null;
  Price70: number | null;
  TaxType: string;
  Condition: string;
  BodyType: string;
  Color: string;
  Image: string;
  Time: string;
  _deleted?: boolean;

  // Market price fields (optional, populated from external sources)
  MarketPriceLow?: number | null;
  MarketPriceMedian?: number | null;
  MarketPriceHigh?: number | null;
  MarketPriceSource?: string | null;
  MarketPriceSamples?: number | null;
  MarketPriceUpdatedAt?: string | null;
  MarketPriceConfidence?: "High" | "Medium" | "Low" | null;
};

// VehicleMeta represents the FULL dataset metadata from API
// This is computed from all records, not just the current page
export type VehicleMeta = {
  total?: number;           // Total count of ALL vehicles (not max ID)
  countsByCategory?: {
    Cars?: number;          // Normalized from "Car", "Cars"
    Motorcycles?: number;   // Normalized from "Motorcycle", "Motorcycles"
    TukTuks?: number;       // Normalized from "Tuk Tuk", "TukTuks", etc.
  };
  avgPrice?: number;        // Average price across ALL vehicles
  noImageCount?: number;    // Count of vehicles without images
  countsByCondition?: {
    New?: number;           // Normalized from "New", "new"
    Used?: number;          // Normalized from "Used", "used"
    Other?: number;         // Catch-all for other conditions
  };
};

// Helper type for computed filtered metadata (client-side)
export type FilteredVehicleMeta = VehicleMeta;
