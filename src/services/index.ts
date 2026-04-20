/**
 * Services Index
 * 
 * Centralized exports for all service layer classes.
 * Provides clean imports for the OOAD service layer.
 * 
 * @module services
 */

// Base Service
export {
  BaseService,
} from "./BaseService";

export type {
  ServiceResult,
  BaseEntity,
  BaseDBRecord,
} from "./BaseService";

// Vehicle Service
export {
  VehicleService,
  vehicleService,
  default as vehicleServiceDefault,
} from "./VehicleService";

// Types
export type {
  VehicleDB,
  VehicleFilters,
  VehicleStats,
  PaginatedResult,
  VehicleEntity,
} from "./VehicleService";
