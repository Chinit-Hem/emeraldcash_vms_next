import { getVehicleById, toVehicle } from "../src/lib/db-schema.ts";

const vehicle = await getVehicleById(1192);
if (vehicle) {
  console.log("Database record:");
  console.log("  id:", vehicle.id);
  console.log("  brand:", vehicle.brand);
  console.log("  model:", vehicle.model);
  console.log("  image_id:", vehicle.image_id);
  console.log("  image_id type:", typeof vehicle.image_id);
  console.log("");
  const apiVehicle = toVehicle(vehicle);
  console.log("API response (toVehicle):");
  console.log("  VehicleId:", apiVehicle.VehicleId);
  console.log("  Image:", apiVehicle.Image);
  console.log("  Image length:", apiVehicle.Image?.length);
} else {
  console.log("Vehicle 1192 not found");
}
