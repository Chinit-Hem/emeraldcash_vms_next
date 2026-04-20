import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { action } = await req.json(); // 'accept' or 'reject'
    const userId = 1; // from auth

    if (action === 'accept') {
      const success = await smsService.acceptTransfer(id, userId);
      return NextResponse.json({ success });
    } else if (action === 'reject') {
      const { remark } = await req.json();
      const success = await smsService.rejectTransfer(id, userId, remark);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

