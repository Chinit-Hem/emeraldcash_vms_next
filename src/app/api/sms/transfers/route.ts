import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

export async function GET() {
  try {
<<<<<<< HEAD
    const pending = await smsService.getPendingTransfers();
    return NextResponse.json({ success: true, data: pending });
=======
    const result = await smsService.getPendingTransfers();
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
<<<<<<< HEAD
    const { assetId, senderId, receiverId, location, remark } = await req.json();
    const transfer = await smsService.createTransfer(assetId, senderId, receiverId, location, remark);
    return NextResponse.json({ success: true, data: transfer });
=======
    const data = await req.json();
    const result = await smsService.createTransfer(data);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
<<<<<<< HEAD

=======
>>>>>>> b54ca2d (feat: add SMS asset management, stock pages, UI components (alerts, badges, buttons, cards), refactor docs to /docs/, lib enhancements (redis, crypto, sms/stock schemas), repositories layer, cleanups, optimizations)
