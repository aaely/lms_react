import { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { verifyAuth } from './utils/auth';

const SHIFT_ROLL_ROLES = ['admin', 'supervisor']

const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Require admin role for shift rolling
  const auth = await verifyAuth(event.headers.authorization, SHIFT_ROLL_ROLES);
    
  if (!auth.authorized) {
    return {
      statusCode: auth.user ? 403 : 401,
      headers,
      body: JSON.stringify({ error: auth.error })
    };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Optional: Get counts before operation for audit logging
    const beforeCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM trailers) as live_count,
        (SELECT COUNT(*) FROM staged_trailers) as staged_count,
        (SELECT COUNT(*) FROM trailers WHERE "actualEndTime" <> '') as to_delete_count
    `;

    // Perform shift roll transaction
    await sql.transaction([
      sql`DELETE FROM trailers WHERE "actualEndTime" <> ''`,
      sql`UPDATE trailers SET "statusOX" = 'C'`,
      sql`INSERT INTO trailers SELECT * FROM staged_trailers`,
      sql`DELETE FROM staged_trailers`
    ]);

    const afterCounts = await sql`
      SELECT COUNT(*) as live_count FROM trailers
    `;

    // Optional: Log the shift roll with user info
    await sql`
      INSERT INTO shift_roll_audit (
        performed_by_user_id, 
        performed_by_email,
        deleted_count,
        inserted_count,
        timestamp
      ) VALUES (
        ${auth.user!.userId},
        ${auth.user!.email},
        ${beforeCounts[0].to_delete_count},
        ${beforeCounts[0].staged_count},
        NOW()
      )
    `;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        message: 'Shift rolled successfully',
        details: {
          deletedTrailers: beforeCounts[0].to_delete_count,
          promotedTrailers: beforeCounts[0].staged_count,
          currentLiveCount: afterCounts[0].live_count,
          performedBy: auth.user!.email
        }
      })
    };
  } catch (error: any) {
    console.error('Shift roll error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Shift roll failed: ' + error.message })
    };
  }
};

export { handler };