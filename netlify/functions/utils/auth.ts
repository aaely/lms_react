import * as jwt from 'jsonwebtoken';
import { Client } from 'pg';

export interface AuthUser {
    userId: number;
    email: string;
    role: string;
}

export interface AuthResult {
    authorized: boolean;
    user?: AuthUser;
    error?: string;
}

// Verify JWT and optionally check role
export async function verifyAuth(
    authHeader: string | undefined,
    requiredRole?: string | string[]
): Promise<AuthResult> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authorized: false, error: 'No token provided' };
    }

    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
        if (requiredRole) {
            const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
            if (!roles.includes(decoded.role)) {
                return { 
                    authorized: false, 
                    error: 'Insufficient permissions',
                    user: decoded
                };
            }
        }

        return { authorized: true, user: decoded };
    } catch (error) {
        return { authorized: false, error: 'Invalid token' };
    }
}

// Update last login timestamp
export async function updateLastLogin(userId: number): Promise<void> {
    const client = new Client({
        connectionString: process.env.NEON_READER_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        await client.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [userId]
        );
    } catch (error) {
        console.error('Error updating last login:', error);
    } finally {
        await client.end();
    }
}