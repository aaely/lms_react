import { neon } from '@neondatabase/serverless';

exports.handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    await sql.transaction([
      sql`DELETE FROM trailers WHERE "actualEndTime" <> ''`,
      sql`UPDATE trailers SET "statusOX" = 'C'`,
      sql`INSERT INTO trailers SELECT * FROM staged_trailers`,
      sql`DELETE FROM staged_trailers`
    ]);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        message: `Successfully deleted live sheet`,
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