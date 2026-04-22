import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

function parseAssetId(id: string): number | null {
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assetId = parseAssetId(id);
    if (assetId === null) {
      return NextResponse.json({ success: false, error: 'Invalid asset id' }, { status: 400 });
    }

    const result = await smsService.getAsset(assetId);
    if (!result.success || !result.data) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assetId = parseAssetId(id);
    if (assetId === null) {
      return NextResponse.json({ success: false, error: 'Invalid asset id' }, { status: 400 });
    }

    const data = await req.json();
    const result = await smsService.update(assetId, data);
    if (!result.success || !result.data) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assetId = parseAssetId(id);
    if (assetId === null) {
      return NextResponse.json({ success: false, error: 'Invalid asset id' }, { status: 400 });
    }

    const result = await smsService.delete(assetId);
    if (!result.success || !result.data) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

