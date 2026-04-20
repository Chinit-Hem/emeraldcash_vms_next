/**
 * SMS Asset Service - OOAD Implementation
 * 
 * Extends BaseService for SMS asset operations.
 * Implements singleton pattern matching VehicleService.
 * 
 * Features:
 * - Full CRUD for sms_assets table
 * - SMS-specific filtering (search, status, assigned_to)
 * - Transfer management (create, update status)
 * - Audit logging
 * - Compatible with existing API routes
 */

import { dbManager } from "@/lib/db-singleton";
import { BaseService, BaseFilters, ServiceResult } from "./BaseService";
import { 
  sms_assets, sms_transfers
} from "@/lib/sms-schema";
import type { 
  SmsStatus, TransferStatus 
} from "@/lib/sms-types";
import { getCache, setCache } from "@/lib/redis";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * SMS Asset database record (snake_case from PostgreSQL)
 */
export interface SmsAssetDB {
  id: string;
  name: string;
  item_code: string | null;
  type: string;
  category: string | null;
  quantity: number | null;
  location: string | null;
  assigned_to: string | null;
  image_url: string | null;
  document_url: string | null;
  description: string | null;
  ref_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * SMS Asset entity (camelCase for frontend)
 */
export interface SmsAssetEntity {
  // BaseEntity properties
  id: string;
  createdAt: string;
  updatedAt: string;
  
  // SMS Asset properties
  name: string;
  itemCode: string | null;
  type: string;
  category: string | null;
  quantity: number | null;
  location: string | null;
  assignedTo: string | null;
  imageUrl: string | null;
  documentUrl: string | null;
  description: string | null;
  refId: string | null;
  status: SmsStatus;
}

/**
 * SMS Transfer entity
 */
export interface SmsTransferEntity {
  id: string;
  assetId: string;
  senderId: number;
  receiverId: number;
  location: string;
  status: TransferStatus;
  remark: string | null;
  createdAt: string;
  acceptedAt: string | null;
}

/**
 * SMS filters extending BaseFilters
 */
export interface SmsFilters extends BaseFilters {
  search?: string;
  status?: SmsStatus;
  assigned_to?: string;
  category?: string;
  assetId?: string;
}

/**
 * Paginated SMS result
 */
export interface PaginatedSmsResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// SMS Asset Service Singleton Class
// ============================================================================

export class SmsAssetService extends BaseService<SmsAssetEntity, SmsAssetDB> {
  private static instance: SmsAssetService | null = null;

  private constructor() {
    super("SmsAssetService", "sms_assets");
  }

  public static getInstance(): SmsAssetService {
    if (!SmsAssetService.instance) {
      SmsAssetService.instance = new SmsAssetService();
    }
    return SmsAssetService.instance;
  }

  // ============================================================================
  // Abstract Method Implementations
  // ============================================================================

  protected toEntity(dbAsset: SmsAssetDB): SmsAssetEntity {
    return {
      id: dbAsset.id as any,
      createdAt: dbAsset.created_at,
      updatedAt: dbAsset.updated_at || dbAsset.created_at,
      
      name: dbAsset.name,
      itemCode: dbAsset.item_code,
      type: dbAsset.type,
      category: dbAsset.category,
      quantity: dbAsset.quantity,
      location: dbAsset.location,
      assignedTo: dbAsset.assigned_to,
      imageUrl: dbAsset.image_url,
      documentUrl: dbAsset.document_url,
      description: dbAsset.description,
      refId: dbAsset.ref_id,
      status: dbAsset.status as SmsStatus,
    };
  }

  protected buildCacheKey(filters?: SmsFilters): string {
    if (!filters) return "sms-assets:all";
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        acc[key] = filters[key as keyof SmsFilters];
        return acc;
      }, {} as Record<string, unknown>);
    return `sms-assets:${JSON.stringify(sortedFilters)}`;
  }

  protected applyFilters(
    baseQuery: string,
    filters: SmsFilters,
    params: (string | number | null)[]
  ): { query: string; params: (string | number | null)[]; paramIndex: number } {
    const conditions: string[] = [];
    let paramIndex = 1;

    // Search in name and description
    if (filters?.search) {
      const pattern = this.buildIlikePattern(filters.search);
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(pattern);
      paramIndex++;
    }

    // Status filter
    if (filters?.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    // Assigned to filter
    if (filters?.assigned_to) {
      conditions.push(`assigned_to ILIKE $${paramIndex}`);
      params.push(this.buildIlikePattern(filters.assigned_to));
      paramIndex++;
    }

    // Category filter
    if (filters?.category) {
      conditions.push(`category ILIKE $${paramIndex}`);
      params.push(this.buildIlikePattern(filters.category));
      paramIndex++;
    }

    // Asset ID filter (for transfers)
    if (filters?.assetId) {
      conditions.push(`sms_assets.id = $${paramIndex}`);
      params.push(filters.assetId);
      paramIndex++;
    }

    let query = baseQuery;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    return { query, params, paramIndex };
  }

  // ============================================================================
  // SMS-SPECIFIC METHODS
  // ============================================================================

  /**
   * Get assets with SMS-specific filters (used by API)
   */
  public async getAssets(filters?: SmsFilters): Promise<ServiceResult<SmsAssetEntity[]>> {
    return this.getAll(filters);
  }

  /**
<<<<<<< HEAD
=======
   * Get single asset by ID (UUID support)
   */
  public async getAsset(id: string): Promise<ServiceResult<SmsAssetEntity>> {
    const startTime = Date.now();
    try {
      const query = `SELECT * FROM sms_assets WHERE id = $1`;
      const result = await dbManager.executeUnsafe<SmsAssetDB>(query, [id]);
      
      if (result.length === 0) {
        return {
          success: false,
          error: `Asset with ID ${id} not found`,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 }
        };
      }

      return {
        success: true,
        data: this.toEntity(result[0]),
        meta: { durationMs: Date.now() - startTime, queryCount: 1 }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch asset',
        meta: { durationMs: Date.now() - startTime, queryCount: 1 }
      };
    }
  }

  /**
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
   * Create new SMS asset (used by API)
   */
  public async createAsset(assetData: Omit<SmsAssetDB, "id" | "created_at" | "updated_at">): Promise<ServiceResult<SmsAssetEntity>> {
    const data = { ...assetData, status: assetData.status || 'Available' };
    const result = await this.create(data as any);
    if (result.success) {
      await this.logAudit(1, 'create_asset', { assetId: result.data.id, data });
    }
    return result;
  }

  /**
<<<<<<< HEAD
=======
   * Update asset (UUID support)
   */
  public async updateAsset(id: string, data: Partial<SmsAssetDB>): Promise<ServiceResult<SmsAssetEntity>> {
    const startTime = Date.now();
    try {
      const columns = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
      if (columns.length === 0) return this.getAsset(id);
      
      const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
      const query = `UPDATE sms_assets SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
      const result = await dbManager.executeUnsafe<SmsAssetDB>(query, [id, ...columns.map(c => (data as any)[c])]);
      
      if (result.length === 0) {
        return {
          success: false,
          error: `Asset with ID ${id} not found`,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 }
        };
      }

      const updated = this.toEntity(result[0]);
      await this.logAudit(1, 'update_asset', { assetId: id, data });
      return {
        success: true,
        data: updated,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update asset',
        meta: { durationMs: Date.now() - startTime, queryCount: 1 }
      };
    }
  }

  /**
   * Delete asset (UUID support)
   */
  public async deleteAsset(id: string): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    try {
      const query = `DELETE FROM sms_assets WHERE id = $1 RETURNING id`;
      const result = await dbManager.executeUnsafe(query, [id]);
      const success = result.length > 0;
      if (success) {
        await this.logAudit(1, 'delete_asset', { assetId: id });
      }
      return {
        success: true,
        data: success,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete asset',
        meta: { durationMs: Date.now() - startTime, queryCount: 1 }
      };
    }
  }

  /**
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
   * Get SMS transfers with optional asset filter
   */
  public async getTransfers(assetId?: string): Promise<ServiceResult<SmsTransferEntity[]>> {
    const startTime = Date.now();
    try {
      let query = `
        SELECT 
          st.id, st.asset_id as \"assetId\", st.sender_id as \"senderId\", 
          st.receiver_id as \"receiverId\", st.location, st.status, st.remark,
          st.created_at as \"createdAt\", st.accepted_at as \"acceptedAt\"
        FROM sms_transfers st
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (assetId) {
        query += ` WHERE st.asset_id = $${paramIndex}`;
        params.push(assetId);
        paramIndex++;
      }

      query += ` ORDER BY st.created_at DESC`;

<<<<<<< HEAD
      const result = await dbManager.executeUnsafe(query + (params.length ? ` RETURNING *` : '')) as Record<string, any>[];
=======
      const result = await dbManager.executeUnsafe(query, params) as Record<string, any>[];
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
      
      const transfers: SmsTransferEntity[] = result.map((row: Record<string, any>) => ({
        id: row.id,
        assetId: row.assetId,
        senderId: row.senderId,
        receiverId: row.receiverId,
        location: row.location,
        status: row.status as TransferStatus,
        remark: row.remark,
        createdAt: row.createdAt,
        acceptedAt: row.acceptedAt,
      }));

      return {
        success: true,
        data: transfers,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transfers';
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
<<<<<<< HEAD
=======
   * Get pending transfers
   */
  public async getPendingTransfers(): Promise<ServiceResult<SmsTransferEntity[]>> {
    const result = await this.getTransfers();
    if (result.success) {
      return {
        ...result,
        data: result.data.filter(t => t.status === 'pending')
      };
    }
    return result;
  }

  /**
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
   * Create transfer request
   */
  public async createTransfer(transferData: {
    assetId: string;
    senderId: number;
    receiverId: number;
    location: string;
    remark?: string;
  }): Promise<ServiceResult<SmsTransferEntity>> {
    const startTime = Date.now();
    try {
      const now = new Date().toISOString();
      const query = `
        INSERT INTO sms_transfers (id, asset_id, sender_id, receiver_id, location, status, remark, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending', $5, $6)
        RETURNING *
      `;
      
      const result = await dbManager.executeUnsafe(query, [
        transferData.assetId,
        transferData.senderId,
        transferData.receiverId,
        transferData.location,
        transferData.remark || null,
        now,
      ]) as Record<string, any>[];

      const transfer = result[0];
      const transferEntity: SmsTransferEntity = {
        id: transfer.id,
        assetId: transfer.asset_id,
        senderId: transfer.sender_id,
        receiverId: transfer.receiver_id,
        location: transfer.location,
        status: 'pending' as TransferStatus,
        remark: transfer.remark,
        createdAt: transfer.created_at,
        acceptedAt: null,
      };

      await this.logAudit(transferData.senderId, 'create_transfer', { transferId: transfer.id });

      return {
        success: true,
        data: transferEntity,
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create transfer';
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Update transfer status (accept/reject)
   */
  public async updateTransferStatus(
    transferId: string, 
    status: TransferStatus,
<<<<<<< HEAD
    userId: number
=======
    userId: number,
    remark?: string
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
  ): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    try {
      const now = status === 'accepted' ? `NOW()` : 'NULL';
<<<<<<< HEAD
      const query = `
        UPDATE sms_transfers 
        SET status = $1, accepted_at = ${now}
=======
      const remarkClause = remark ? `, remark = $3` : '';
      const params = [status, transferId];
      if (remark) params.push(remark);

      const query = `
        UPDATE sms_transfers 
        SET status = $1, accepted_at = ${now} ${remarkClause}
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
        WHERE id = $2
        RETURNING id
      `;
      
<<<<<<< HEAD
      const result = await dbManager.executeUnsafe(query, [status, transferId]) as Record<string, any>[];
=======
      const result = await dbManager.executeUnsafe(query, params) as Record<string, any>[];
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
      
      if (result.length === 0) {
        return {
          success: false,
          error: 'Transfer not found',
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

<<<<<<< HEAD
      await this.logAudit(userId, 'update_transfer_status', { transferId, status });
=======
      await this.logAudit(userId, 'update_transfer_status', { transferId, status, remark });
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
      
      return {
        success: true,
        data: true,
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update transfer';
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
<<<<<<< HEAD
=======
   * Accept transfer helper
   */
  public async acceptTransfer(transferId: string, userId: number): Promise<ServiceResult<boolean>> {
    return this.updateTransferStatus(transferId, 'accepted', userId);
  }

  /**
   * Reject transfer helper
   */
  public async rejectTransfer(transferId: string, userId: number, remark?: string): Promise<ServiceResult<boolean>> {
    return this.updateTransferStatus(transferId, 'rejected', userId, remark);
  }

  /**
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
   * Log audit trail
   */
  private async logAudit(
    userId: number, 
    action: string, 
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO sms_audit_logs (user_id, action, metadata)
        VALUES ($1, $2, $3)
      `;
      await dbManager.executeUnsafe(query, [userId, action, metadata]) as any;
    } catch (error) {
      console.error('[SmsAssetService.logAudit] Failed to log audit:', error);
    }
  }

  /**
   * Get SMS asset stats (inventory counts) - FIXED: Pure SMS stats, no vehicle pricing
   */
  public async getStats(): Promise<ServiceResult<any>> {
    const cacheKey = 'sms:stats';
    const startTime = Date.now();

    try {
      // Try Redis cache first (5min TTL)
      const cached = await getCache(cacheKey);
      if (cached) {
        return {
<<<<<<< HEAD
</xai:function_call >

<xai:function_call name="edit_file">
<parameter name="path">src/services/SmsService.ts
=======
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
          success: true,
          data: cached as any,
          meta: { durationMs: 1, queryCount: 0, cacheHit: true }
        };
      }

      // Parameterized queries via template literals - type assertion fixed
      const assetsResult = await dbManager.execute`SELECT status, COUNT(*)::integer as count FROM sms_assets GROUP BY status`;
      const pendingResult = await dbManager.execute`SELECT COALESCE(COUNT(*), 0)::integer as count FROM sms_transfers WHERE status = 'pending'`;
      const assetsStats = assetsResult as Record<string, unknown>[];
      const pendingStats = pendingResult as Record<string, unknown>[];

      // Defensive parsing
      const statusCounts: Record<string, number> = {};
      for (const row of assetsStats) {
        const status = row.status as string;
        const count = Number(row.count) || 0;
        statusCounts[status] = count;
      }

      const pendingCount = Number(pendingStats[0]?.count) || 0;

      const stats = {
        totalAssets: (statusCounts.Available || 0) + (statusCounts['In Use'] || 0) + (statusCounts.Borrowed || 0),
        available: statusCounts.Available || 0,
        inUse: statusCounts['In Use'] || 0,
        borrowed: statusCounts.Borrowed || 0,
        pendingTransfers: pendingCount,
      };

      // Cache in Redis (5min)
      await setCache(cacheKey, stats, 300);

<<<<<<< HEAD

</xai:function_call >

<xai:function_call name="edit_file">
<parameter name="path">src/services/SmsService.ts

</xai:function_call >

<xai:function_call name="edit_file">
<parameter name="path">src/app/api/sms/stats/route.ts

=======
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
      return {
        success: true,
        data: stats,
        meta: { durationMs: Date.now() - startTime, queryCount: 2, cacheHit: false }
      };

    } catch (error) {
      console.error('[SMS Stats] DB Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch SMS stats',
        meta: { durationMs: Date.now() - startTime, queryCount: 0 }
      };
    }
  }

  /**
   * Get complete history for asset: transfers + audit logs (filtered by metadata.assetId)
   */
  public async getAssetHistory(assetId: string): Promise<ServiceResult<any>> {
    const startTime = Date.now();
    try {
      // Get asset info
      const assetQuery = `SELECT name FROM sms_assets WHERE id = $1`;
      const assetResult = await dbManager.executeUnsafe(assetQuery, [assetId]) as Record<string, any>[];
      const assetName = assetResult[0]?.name || 'Unknown';

      // Get transfers
      const transfersQuery = `
        SELECT 
          'transfer' as type,
<<<<<<< HEAD
          st.id, st.asset_id as "assetId", st.sender_id as "senderId", 
          st.receiver_id as "receiverId", st.location, st.status, st.remark as description,
=======
          st.id, st.asset_id as \"assetId\", st.sender_id as \"senderId\", 
          st.receiver_id as \"receiverId\", st.location, st.status, st.remark as description,
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
          st.created_at as timestamp, st.accepted_at
        FROM sms_transfers st
        WHERE st.asset_id = $1
        ORDER BY st.created_at DESC
      `;
      const transfersResult = await dbManager.executeUnsafe(transfersQuery, [assetId]) as Record<string, any>[];

      // Get audits (filter metadata->>'assetId' = assetId)
      const auditsQuery = `
        SELECT 
          'audit' as type,
          sal.id, sal.user_id, sal.action as description, sal.metadata,
          sal.created_at as timestamp
        FROM sms_audit_logs sal
        WHERE (sal.metadata->>'assetId') = $1 OR sal.metadata @> $2::jsonb
        ORDER BY sal.created_at DESC
      `;
<<<<<<< HEAD
      const auditsResult = await dbManager.executeUnsafe(auditsQuery, [assetId, `{ "assetId": "${assetId}" }`]) as Record<string, any>[];
=======
      const auditsResult = await dbManager.executeUnsafe(auditsQuery, [assetId, `{ \"assetId\": \"${assetId}\" }`]) as Record<string, any>[];
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)

      // Combine and sort by timestamp DESC
      const events = [
        ...transfersResult.map((t: any) => ({
          type: t.type,
          id: t.id,
          assetId: t.assetId,
          userId: t.senderId || t.user_id,
          description: t.description || t.remark,
          location: t.location,
          status: t.status,
          timestamp: t.timestamp,
          acceptedAt: t.acceptedAt,
          metadata: t.metadata
        })),
        ...auditsResult.map((a: any) => ({
          type: a.type,
          id: a.id,
          assetId,
          userId: a.user_id,
          description: a.description,
          timestamp: a.timestamp,
          metadata: a.metadata
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        success: true,
        data: {
          assetId,
          assetName,
          totalEvents: events.length,
          events
        },
        meta: { durationMs: Date.now() - startTime, queryCount: 3 }
      };
    } catch (error) {
      console.error('[getAssetHistory] Error:', error);
      return {
        success: false,
        error: 'Failed to fetch asset history',
        meta: { durationMs: Date.now() - startTime }
      };
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

/**
 * Singleton SMS service instance
 * Import this for all SMS operations
 */
export const smsService = SmsAssetService.getInstance();

export default smsService;
<<<<<<< HEAD

=======
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
