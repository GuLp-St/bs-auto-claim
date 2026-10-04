import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'fallback_secret_must_be_32_chars_long!!'
);

export async function createSession(userId: string, username: string, isAdmin: boolean) {
  const token = await new SignJWT({ userId, username, isAdmin })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secretKey);

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return null;
  
    try {
      const { payload } = await jwtVerify(token, secretKey); // ✅ Correct: token first, secretKey second
      return payload as { userId: string; username: string; isAdmin: boolean };
    } catch {
      return null;
    }
  }

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}