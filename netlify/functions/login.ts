import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { username, password } = JSON.parse(event.body || '{}');

    if (!username || !password) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Email and password required' }) };
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const result = await client.query(
            'SELECT id, email, password_hash, role FROM users WHERE email = $1',
            [username]
        );
        console.log(result)

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

        // Generate access token (short-lived)
        const accessToken = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' } // Short lived
        );

        // Generate refresh token (long-lived)
        const refreshToken = jwt.sign(
            { 
                userId: user.id,
                type: 'refresh' 
            },
            process.env.JWT_REFRESH_SECRET!, // Different secret
            { expiresIn: '1d' }
        );

        // Store refresh token in database
        await client.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
            [user.id, refreshToken]
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                accessToken,
                refreshToken,
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