import { Handler, HandlerEvent } from '@netlify/functions';
import { Client } from 'pg';
import * as jwt from 'jsonwebtoken';

const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { refreshToken } = JSON.parse(event.body || '{}');

    if (!refreshToken) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Refresh token required' }) 
        };
    }

    const client = new Client({
        connectionString: process.env.NEON_READER_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Verify refresh token
        const _ = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

        // Check if refresh token exists in database and hasn't expired
        const result = await client.query(
            'SELECT rt.*, u.email, u.role FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token = $1 AND rt.expires_at > NOW()',
            [refreshToken]
        );

        if (result.rows.length === 0) {
            return { 
                statusCode: 401, 
                body: JSON.stringify({ error: 'Invalid or expired refresh token' }) 
            };
        }

        const tokenData = result.rows[0];

        // Generate new access token
        const newAccessToken = jwt.sign(
            { 
                userId: tokenData.user_id, 
                email: tokenData.email, 
                role: tokenData.role 
            },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                accessToken: newAccessToken
            })
        };

    } catch (error) {
        console.error('Refresh error:', error);
        return { 
            statusCode: 401, 
            body: JSON.stringify({ error: 'Invalid refresh token' }) 
        };
    } finally {
        await client.end();
    }
};

export { handler };