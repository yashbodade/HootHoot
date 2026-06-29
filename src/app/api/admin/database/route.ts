import { NextRequest, NextResponse } from 'next/server';
import { getConnectionInfo, TABLES_INFO } from '@/lib/db-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get connection information
    const connInfo = await getConnectionInfo();

    // Calculate statistics
    const totalTables = Object.values(TABLES_INFO).reduce(
      (sum, tables) => sum + tables.length,
      0
    );

    const tablesBySchema = {
      neon_auth: TABLES_INFO.neon_auth.length,
      public: TABLES_INFO.public.length,
    };

    return NextResponse.json({
      status: 'success',
      connection: connInfo,
      tables: TABLES_INFO,
      statistics: {
        totalTables,
        totalSchemas: Object.keys(TABLES_INFO).length,
        tablesBySchema,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Database admin error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
