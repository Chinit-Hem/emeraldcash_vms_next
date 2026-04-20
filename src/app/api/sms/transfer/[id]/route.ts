import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { action, remark } = await req.json(); // 'accept' or 'reject'
    const userId = 1; // from auth - placeholder

    if (action === 'accept') {
      const result = await smsService.acceptTransfer(id, userId);
      return NextResponse.json({ success: result.success, error: result.error });
    } else if (action === 'reject') {
      const result = await smsService.rejectTransfer(id, userId, remark);
      return NextResponse.json({ success: result.success, error: result.error });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
