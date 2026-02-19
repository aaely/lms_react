import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Email and password required' }) };
    }

    const client = new Client({
        connectionString: process.env.NEON_READER_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const result = await client.query(
            'SELECT id, email, password_hash, role FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return { 
                statusCode: 401, 
                body: JSON.stringify({ error: 'Invalid credentials' }) 
            };
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        
        if (!valid) {
            return { 
                statusCode: 401, 
                body: JSON.stringify({ error: 'Invalid credentials' }) 
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                }
            })
        };

    } catch (error) {
        console.error('Login error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Login failed' }) 
        };
    } finally {
        await client.end();
    }
};

export { handler };