import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';

import { authConfig } from '@/app/(auth)/auth.config';

// Get the auth middleware
const authMiddleware = NextAuth(authConfig).auth;

// Export the middleware function
export default authMiddleware;

export const config = {
  matcher: [
    '/',
    '/:id',
    '/api/:path*',
    '/login',
    '/register'
  ],
};
