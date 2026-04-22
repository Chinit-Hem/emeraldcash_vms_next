/**
 * Database Module - Legacy Compatibility Layer
 */

export { sql, queryWithRetry, testConnection, isDatabaseHealthy, getConnectionStats, resetConnection, getDbManager as dbManager } from "./db-singleton";

export type { 
  VehicleFilters, 
  VehicleStats, 
  PaginatedResult 
} from "@/services/VehicleService";

export type {
  ServiceResult
} from "@/services/BaseService";



