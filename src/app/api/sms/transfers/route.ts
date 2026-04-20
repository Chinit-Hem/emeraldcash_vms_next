import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

export async function GET() {
  try {
    const pending = await smsService.getPendingTransfers();
    return NextResponse.json({ success: true, data: pending });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { assetId, senderId, receiverId, location, remark } = await req.json();
    const transfer = await smsService.createTransfer(assetId, senderId, receiverId, location, remark);
    return NextResponse.json({ success: true, data: transfer });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

