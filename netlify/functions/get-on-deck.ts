import { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { verifyAuth } from './utils/auth';

const roles = ['mfu', 'admin', 'supervisor', 'clerk', 'security', 'receiving']


const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const auth = await verifyAuth(event.headers.authorization, roles);
    
  if (!auth.authorized) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: auth.error })
    };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    const result = await sql`
      SELECT *, '' as origin FROM staged_trailers
      UNION ALL
      SELECT *, 'carryover' as origin FROM trailers WHERE "actualEndTime" = ''
    `;

    const stagedCount = result.filter(t => t.origin === '').length;
    const carryoverCount = result.filter(t => t.origin === 'carryover').length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        trailers: result,
        summary: {
          total: result.length,
          staged: stagedCount,
          carryover: carryoverCount
        }
      })
    };
  } catch (error: any) {
    console.error('Error getting preview:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

export { handler };