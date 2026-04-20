import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {

</xai:function_call >

<xai:function_call name="edit_file">
<parameter name="path">src/app/api/sms/stats/route.ts
    const result = await smsService.getStats();
    
    const duration = Date.now() - startTime;
</xai:function_call >

<xai:function_call name="edit_file">
<parameter name="path">src/app/api/sms/stats/route.ts
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        meta: { durationMs: duration }
      });
    } else {
      // Service error logged
</xai:function_call >

<xai:function_call name="edit_file">
<parameter name="path">src/app/api/sms/stats/route.ts
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fetch stats'
      }, { status: 500 });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    // Uncaught error logged
</xai:function_call >

<xai:function_call name="edit_file">
<parameter name="path">src/services/VehicleService.ts
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

