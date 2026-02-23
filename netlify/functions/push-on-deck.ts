import { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { verifyAuth } from './utils/auth';

const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Require admin or manager role for bulk staging
  const auth = await verifyAuth(event.headers.authorization, ['admin', 'manager']);
    
  if (!auth.authorized) {
    return {
      statusCode: auth.user ? 403 : 401,
      headers,
      body: JSON.stringify({ error: auth.error })
    };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const trailers = JSON.parse(event.body || '[]');
    
    if (!Array.isArray(trailers) || trailers.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body must be a non-empty array of trailers' })
      };
    }

    console.log(`Received ${trailers.length} trailers to insert from ${auth.user!.email}`);

    await sql.transaction(
      trailers.map((trailer: any) => sql`
        INSERT INTO staged_trailers (
          uuid, hour, "dateShift", "lmsAccent", "dockCode", "acaType",
          status, "routeId", scac, trailer1, trailer2, "firstSupplier",
          "dockStopSequence", "planStartDate", "planStartTime",
          "scheduleStartDate", "adjustedStartTime", "scheduleEndDate",
          "scheduleEndTime", door, "gateArrivalTime", "actualStartTime",
          "actualEndTime", "statusOX", "ryderComments", "gmComments",
          "lowestDoh"
        ) VALUES (
          ${trailer.uuid}, ${trailer.hour}, ${trailer.dateShift},
          ${trailer.lmsAccent}, ${trailer.dockCode}, ${trailer.acaType},
          ${trailer.status}, ${trailer.routeId}, ${trailer.scac},
          ${trailer.trailer1}, ${trailer.trailer2}, ${trailer.firstSupplier},
          ${trailer.dockStopSequence}, ${trailer.planStartDate},
          ${trailer.planStartTime}, ${trailer.scheduleStartDate},
          ${trailer.adjustedStartTime}, ${trailer.scheduleEndDate},
          ${trailer.scheduleEndTime}, ${trailer.door}, ${trailer.gateArrivalTime},
          ${trailer.actualStartTime}, ${trailer.actualEndTime},
          ${trailer.statusOX}, ${trailer.ryderComments}, ${trailer.gmComments},
          ${trailer.lowestDoh}
        )
      `),
    );

    // Optional: Log the bulk insert for audit
    await sql`
      INSERT INTO bulk_insert_audit (
        inserted_by_user_id,
        inserted_by_email,
        trailer_count,
        table_name,
        timestamp
      ) VALUES (
        ${auth.user!.userId},
        ${auth.user!.email},
        ${trailers.length},
        'staged_trailers',
        NOW()
      )
    `;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        message: `Successfully inserted ${trailers.length} trailers into staging`,
        count: trailers.length,
        insertedBy: auth.user!.email
      })
    };
  } catch (error: any) {
    console.error('Bulk insert error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

export { handler };