import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { action } = await req.json(); // 'accept' or 'reject'
    const userId = 1; // from auth

    if (action === 'accept') {
      await smsService.updateTransferStatus(id, 'accepted', userId);
      return NextResponse.json({ success: true });
    } else if (action === 'reject') {
      const { remark } = await req.json();
      await smsService.updateTransferStatus(id, 'rejected', userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

