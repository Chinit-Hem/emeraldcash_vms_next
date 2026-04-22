import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

export async function GET() {
  try {
    const result = await smsService.getTransfers();
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch transfers' },
        { status: 500 }
      );
    }

    const pending = (result.data || []).filter((transfer) => transfer.status === 'pending');
    return NextResponse.json({ success: true, data: pending, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { assetId, senderId, receiverId, location, remark } = await req.json();
    const result = await smsService.createTransfer({
      assetId,
      senderId: Number(senderId),
      receiverId: Number(receiverId),
      location,
      remark,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create transfer' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

