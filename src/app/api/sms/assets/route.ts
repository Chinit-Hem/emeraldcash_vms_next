import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';
import type { SmsAsset } from '@/lib/sms-types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const assigned_to = searchParams.get('assigned_to') || undefined;
    const assets = await smsService.getAssets({ search, status, assigned_to });
    return NextResponse.json({ success: true, data: assets });
  } catch (error) {
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

