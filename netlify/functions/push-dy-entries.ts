import { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { verifyAuth } from './utils/auth';
import { type DyCommLog } from '../../src/signals/signals'

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

  const auth = await verifyAuth(event.headers.authorization, ['admin', 'supervisor']);
  if (!auth.authorized) {
    return {
      statusCode: auth.user ? 403 : 401,
      headers,
      body: JSON.stringify({ error: auth.error })
    };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = JSON.parse(event.body || '{}');

    // Accept either a single entry or a batch array
    const entries: DyCommLog[] = Array.isArray(body) ? body : [body];

    if (entries.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body must be a non-empty array of exception log entries' })
      };
    }

    console.log(`Received ${entries.length} exception log entries from ${auth.user!.email}`);

    await sql.transaction(
      entries.map((entry: DyCommLog) => sql`
        INSERT INTO dy_communication_log (
        "loadNum", dock, route, scac, supplier, location,
        part, pdt, "deliveryDate", "deliveryTime",
        "createdBy", trailer
        ) VALUES (
        ${entry.loadNum}, ${entry.dock}, ${entry.route}, 
        ${entry.scac}, ${entry.supplier}, ${entry.location},
        ${entry.part}, ${entry.pdt}, ${entry.deliveryDate}, 
        ${entry.deliveryTime}, ${entry.createdBy}, ${entry.trailer}
        )
        ON CONFLICT ("loadNum", "dock") DO UPDATE SET
            "trailer"       = EXCLUDED."trailer",
            "scac"          = EXCLUDED."scac",
            "route"         = EXCLUDED."route",
            "location"      = EXCLUDED."location",
            "deliveryDate"  = EXCLUDED."deliveryDate",
            "deliveryTime"  = EXCLUDED."deliveryTime",
            "supplier"      = EXCLUDED."supplier",
            "part"          = EXCLUDED."part",
            "pdt"           = EXCLUDED."pdt",
            "updatedAt"     = NOW()
        `)
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: `Successfully inserted ${entries.length} exception log ${entries.length === 1 ? 'entry' : 'entries'}`,
        count: entries.length,
        insertedBy: auth.user!.email
      })
    };
  } catch (error: any) {
    console.error('Exception log insert error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

export { handler };