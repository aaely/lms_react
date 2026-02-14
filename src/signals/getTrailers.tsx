import { neon } from "@neondatabase/serverless";

exports.handler = async (event: any) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Initialize Neon connection
    const sql = neon(process.env.DATABASE_URL!);

    // Get dock filter from query params if provided
    const dockCode = event.queryStringParameters?.dockCode;
    
    let query: any = 'SELECT * FROM trailers';
    if (dockCode) {
      query += ` WHERE "dockCode" = '${dockCode}'`;
    }
    query += ' ORDER BY "scheduleStartDate", "adjustedStartTime"';

    const trailers = await sql(query);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(trailers),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch trailers' }),
    };
  }
};