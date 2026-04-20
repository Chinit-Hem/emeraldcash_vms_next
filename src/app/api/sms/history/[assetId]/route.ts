import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

<<<<<<< HEAD
export async function GET(req: NextRequest, { params }: { params: { assetId: string } }) {
  try {
    const { assetId } = params;
    const history = await smsService.getAssetHistory(assetId);
    return NextResponse.json({ success: true, data: history });
=======
export async function GET(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await params;
    const result = await smsService.getAssetHistory(assetId);
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
