import { smsService } from '@/services/SmsService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const result = await smsService.getStats();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        meta: { durationMs: duration, queryCount: 2, cacheHit: false }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fetch stats'
      }, { status: 500 });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[SMS Stats] DB Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch SMS stats',
      meta: { durationMs: duration, queryCount: 0 }
    }, { status: 500 });
  }
}

