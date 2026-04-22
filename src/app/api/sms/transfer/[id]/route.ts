import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await req.json();
    const userId = 1; // from auth

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const status = action === 'accept' ? 'accepted' : 'rejected';
    const result = await smsService.updateTransferStatus(id, status, userId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update transfer status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

