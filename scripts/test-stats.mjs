/**
 * Test script to verify vehicle stats query
 */
import { vehicleService } from '../src/services/VehicleService.ts';

async function testStats() {
  console.log('Testing VehicleService.getVehicleStats()...');
  
  try {
    // Clear cache first
    vehicleService.clearCache();
    console.log('Cache cleared');
    
    // Get stats with force refresh
    const result = await vehicleService.getVehicleStats(true);
    
    console.log('Result success:', result.success);
    console.log('Result data:', JSON.stringify(result.data, null, 2));
    console.log('Result meta:', result.meta);
    
    if (!result.success) {
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testStats();
