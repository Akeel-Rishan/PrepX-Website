import { NextResponse } from 'next/server';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
  service: 'prepx';
}

export function GET(): NextResponse<HealthResponse> {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'prepx',
    },
    { status: 200 }
  );
}
