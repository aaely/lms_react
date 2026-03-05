import { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { verifyAuth } from './utils/auth';
import { type ExceptionLog } from '../../src/signals/signals'

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
    const entries: ExceptionLog[] = Array.isArray(body) ? body : [body];

    if (entries.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body must be a non-empty array of exception log entries' })
      };
    }

    console.log(`Received ${entries.length} exception log entries from ${auth.user!.email}`);

    await sql.transaction(
      entries.map((entry: ExceptionLog) => sql`
        INSERT INTO exception_log (
        "loadNum", dock, type, status, route, scac,
        trailer1, trailer2, supplier, "dockSequence",
        "originalDate", "originalTime", "newDate", "newTime",
        "newEndDate", "newEndTime", comment
        ) VALUES (
        ${entry.loadNum}, ${entry.dock}, ${entry.type},
        ${entry.status}, ${entry.route}, ${entry.scac},
        ${entry.trailer1}, ${entry.trailer2 ?? null},
        ${entry.supplier}, ${entry.dockSequence},
        ${entry.originalDate}, ${entry.originalTime},
        ${entry.newDate}, ${entry.newTime},
        ${entry.newEndDate}, ${entry.newEndTime},
        ${entry.comment ?? null}
        )
        ON CONFLICT ("loadNum", dock) DO UPDATE SET
        type            = EXCLUDED.type,
        status          = EXCLUDED.status,
        route           = EXCLUDED.route,
        scac            = EXCLUDED.scac,
        trailer1        = EXCLUDED.trailer1,
        trailer2        = EXCLUDED.trailer2,
        supplier        = EXCLUDED.supplier,
        "dockSequence"  = EXCLUDED."dockSequence",
        "originalDate"  = EXCLUDED."originalDate",
        "originalTime"  = EXCLUDED."originalTime",
        "newDate"       = EXCLUDED."newDate",
        "newTime"       = EXCLUDED."newTime",
        "newEndDate"    = EXCLUDED."newEndDate",
        "newEndTime"    = EXCLUDED."newEndTime",
        comment         = EXCLUDED.comment,
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