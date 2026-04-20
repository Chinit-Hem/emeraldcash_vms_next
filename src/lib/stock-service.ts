import { vehicleService } from '@/services/VehicleService';
import type { StockItem, StockStats, StockMovement } from '@/lib/types';

export async function getStockLevels(modelKey?: string): Promise<StockItem[]> {
  return [];
}

export async function getStockStats(): Promise<StockStats> {
  return { total_items: 0, total_quantity: 0, low_stock_items: 0, locations: [] };
}

export async function adjustStock(modelKey: string, delta: number, reason: string, location: string, userId: number): Promise<boolean> {
  const result = await vehicleService.adjustStock(modelKey, delta, reason, location, userId);
  if (!result.success) throw new Error(result.error || 'Failed to adjust stock');
  return true;
}

export async function transferStock(modelKey: string, qty: number, fromLoc: string, toLoc: string, reason: string, userId: number): Promise<boolean> {
  const result = await vehicleService.transferStock(modelKey, qty, fromLoc, toLoc, reason, userId);
  if (!result.success) throw new Error(result.error || 'Failed to transfer stock');
  return true;
}

export async function seedStock(): Promise<number> {
  const result = await vehicleService.seedStockFromVehicles();
  if (!result.success) throw new Error(result.error || 'Failed to seed stock');
  return result.data;
}

