import { neon } from '@neondatabase/serverless';

exports.handler = async (event: any) => {
    const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
    }

    try {
        const sql = neon(process.env.DATABASE_URL!);
        
        const result = await sql`
            SELECT *, '' as origin FROM staged_trailers
            UNION ALL
            SELECT *, 'carryover' as origin FROM trailers where "actualEndTime" = ''
        `;
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
            trailers: result,
            })
        };
    } catch (error: any) {
        console.error('Error getting count:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};