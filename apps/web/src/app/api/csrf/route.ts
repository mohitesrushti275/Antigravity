import { generateCsrfToken } from '@/lib/csrf';

// GET /api/csrf — Issue a CSRF token (sets cookie + returns token)
export async function GET() {
  const { token, cookieHeader } = generateCsrfToken();

  return Response.json(
    { data: { token } },
    {
      headers: {
        'Set-Cookie': cookieHeader,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
