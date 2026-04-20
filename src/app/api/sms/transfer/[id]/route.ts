import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

<<<<<<< HEAD
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
=======
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
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
<<<<<<< HEAD

=======
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
