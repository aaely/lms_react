import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

interface UserBody {
    email: string;
    password: string;
    role?: string;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { email, password, role } = JSON.parse(event.body || '{}') as UserBody;

    if (!email || !password) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Email and password required' }) };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const client = new Client({
        connectionString: process.env.NEON_WRITER_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const result = await client.query(
            'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
            [email, passwordHash, role || 'clerk']
        );

        return {
            statusCode: 201,
            body: JSON.stringify({ user: result.rows[0] })
        };

    } catch (error: any) {
        if (error.code === '23505') {
            return { 
                statusCode: 409, 
                body: JSON.stringify({ error: 'Email already exists' }) 
            };
        }
        console.error('Registration error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Registration failed' }) 
        };
    } finally {
        await client.end();
    }
};

export { handler };