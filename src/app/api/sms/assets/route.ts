import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';
import type { SmsAsset } from '@/lib/sms-types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const assigned_to = searchParams.get('assigned_to') || undefined;

    // Note: Service needs pagination - using BaseService getAll with limit/offset
    const filters = { 
      search, 
      status, 
      assigned_to, 
      limit: pageSize, 
      offset: (page - 1) * pageSize 
    };
    const result = await smsService.getAssets(filters as any);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch assets' },
        { status: 500 }
      );
    }

    const total = result.data?.length || 0;
    
    return NextResponse.json({ 
      success: true, 
      data: result.data || [], 
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('[SMS Assets GET]', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const result = await smsService.createAsset(data);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create asset' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data, meta: result.meta }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
