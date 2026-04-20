import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

export async function GET(req: NextRequest, { params }: { params: { assetId: string } }) {
  try {
    const { assetId } = params;
    const history = await smsService.getAssetHistory(assetId);
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

