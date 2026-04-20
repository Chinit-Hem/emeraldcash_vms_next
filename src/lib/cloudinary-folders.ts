// Cloudinary folder mapping for vehicle categories
// Using direct folder structure: Cars, Motorcycles, TukTuks

export const CLOUDINARY_FOLDERS = {
  CARS: "Cars",
  MOTORCYCLES: "Motorcycles",
  TUKTUKS: "TukTuks",
} as const;

/**
 * Get the correct Cloudinary folder based on vehicle category
 * @param category - Vehicle category (e.g., "SUV", "Car", "Motorcycle", "TukTuk")
 * @returns Folder path for Cloudinary upload (e.g., "Cars", "Motorcycles", "TukTuks")
 */
export function getCloudinaryFolder(category: string): string {
  const cat = category.toLowerCase().trim();
  
  // Motorcycles
  if (
    cat.includes("motor") ||
    cat.includes("bike") ||
    cat.includes("scooter") ||
    cat.includes("moto")
  ) {
    return CLOUDINARY_FOLDERS.MOTORCYCLES;
  }
  
  // TukTuks / Auto Rickshaws
  if (
    cat.includes("tuk") ||
    cat.includes("rickshaw") ||
    cat.includes("auto") ||
    cat.includes("three wheel")
  ) {
    return CLOUDINARY_FOLDERS.TUKTUKS;
  }
  
  // Default to Cars (SUV, Sedan, Truck, Car, etc.)
  return CLOUDINARY_FOLDERS.CARS;
}

/**
 * Category mapping for reference
 * Maps vehicle categories to Cloudinary folder paths
 */
export const CATEGORY_MAPPING: Record<string, string> = {
  // Cars -> Cars
  "suv": CLOUDINARY_FOLDERS.CARS,
  "car": CLOUDINARY_FOLDERS.CARS,
  "sedan": CLOUDINARY_FOLDERS.CARS,
  "truck": CLOUDINARY_FOLDERS.CARS,
  "pickup": CLOUDINARY_FOLDERS.CARS,
  "van": CLOUDINARY_FOLDERS.CARS,
  "hatchback": CLOUDINARY_FOLDERS.CARS,
  "coupe": CLOUDINARY_FOLDERS.CARS,
  "wagon": CLOUDINARY_FOLDERS.CARS,
  "convertible": CLOUDINARY_FOLDERS.CARS,
  "jeep": CLOUDINARY_FOLDERS.CARS,
  
  // Motorcycles -> Motorcycles
  "motorcycle": CLOUDINARY_FOLDERS.MOTORCYCLES,
  "motorbike": CLOUDINARY_FOLDERS.MOTORCYCLES,
  "scooter": CLOUDINARY_FOLDERS.MOTORCYCLES,
  "moped": CLOUDINARY_FOLDERS.MOTORCYCLES,
  "dirt bike": CLOUDINARY_FOLDERS.MOTORCYCLES,
  "sport bike": CLOUDINARY_FOLDERS.MOTORCYCLES,
  
  // TukTuks -> TukTuks
  "tuktuk": CLOUDINARY_FOLDERS.TUKTUKS,
  "tuk-tuk": CLOUDINARY_FOLDERS.TUKTUKS,
  "auto rickshaw": CLOUDINARY_FOLDERS.TUKTUKS,
  "three wheeler": CLOUDINARY_FOLDERS.TUKTUKS,
  "tricycle": CLOUDINARY_FOLDERS.TUKTUKS,
};
