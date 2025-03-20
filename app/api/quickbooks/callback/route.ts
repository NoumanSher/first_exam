import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { Buffer } from 'buffer';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId');
  const state = searchParams.get('state');

  if (!code || !realmId) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  try {
    const QB_CLIENT_ID = process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID;
    const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
    const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/api/quickbooks/callback`;
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

    // Exchange authorization code for tokens
    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')}`,
        },
      }
    );

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + response.data.expires_in);

    // Create auth object
    const auth = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: expiresAt.toISOString(),
      realmId,
    };

    // Redirect to the main page with auth data
    const redirectUrl = new URL('/', request.nextUrl.origin);
    const authParam = encodeURIComponent(JSON.stringify(auth));
    redirectUrl.searchParams.set('auth', authParam);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in QuickBooks callback:', error);
    return NextResponse.json(
      { error: 'Error processing QuickBooks callback' },
      { status: 500 }
    );
  }
} 