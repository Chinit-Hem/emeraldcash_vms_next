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

    const filters = { 
      search, 
      status, 
      assigned_to, 
      limit: pageSize, 
      offset: (page - 1) * pageSize 
    };
    const result = await smsService.getAssets(filters as any);
    
    return NextResponse.json({ 
      success: true, 
      data: result.data || [], 
      total: result.meta?.total || 0,
      page,
      pageSize,
      totalPages: Math.ceil((result.meta?.total || 0) / pageSize)
    });
  } catch (error) {
    console.error('[SMS Assets GET]', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const asset = await smsService.createAsset(data);
    return NextResponse.json({ success: true, data: asset });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

