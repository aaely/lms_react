import { neon } from '@neondatabase/serverless';

exports.handler = async (event: any) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const trailer = JSON.parse(event.body);
    
    // Your insert logic here
    const result = await sql`
      INSERT INTO trailers ... RETURNING *
    `;
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(result[0])
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};