import { Handler, HandlerEvent } from '@netlify/functions';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const { username, password, role = 'user' } = JSON.parse(event.body || '{}');
    console.log(username, password)
    if (!username || !password) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Email and password required' }) 
        };
    }

    // Validate password strength
    if (password.length < 8) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Password must be at least 8 characters' }) 
        };
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Check if user already exists
        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [username]
        );

        if (existingUser.rows.length > 0) {
            return { 
                statusCode: 409, 
                body: JSON.stringify({ error: 'Email already registered' }) 
            };
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Insert new user
        const result = await client.query(
            'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
            [username, passwordHash, role]
        );

        const newUser = result.rows[0];

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'User created successfully',
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    role: newUser.role,
                    createdAt: newUser.created_at
                }
            })
        };

    } catch (error) {
        console.error('Signup error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Signup failed' }) 
        };
    } finally {
        await client.end();
    }
};

export { handler };