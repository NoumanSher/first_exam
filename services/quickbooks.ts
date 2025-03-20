// services/quickbooks.ts
import axios from 'axios';
import { QuickBooksAuth, Invoice } from '../types';
import { Buffer } from 'buffer';

const QB_CLIENT_ID = process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID;
const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/api/quickbooks/callback`;

/**
 * Initiate the QuickBooks OAuth flow
 */
export function initiateQuickBooksAuth() {
  // QuickBooks OAuth 2.0 authorization URL
  const authUrl = 'https://appcenter.intuit.com/connect/oauth2';
  
  // Required parameters
  const params = new URLSearchParams({
    client_id: QB_CLIENT_ID!,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: REDIRECT_URI,
    state: generateRandomState(), // For CSRF protection
  });
  
  // Redirect to QuickBooks authorization page
  window.location.href = `${authUrl}?${params.toString()}`;
}

/**
 * Process auth data from URL
 */
export function processAuthFromURL(authParam: string): QuickBooksAuth | null {
  try {
    const authData = JSON.parse(decodeURIComponent(authParam)) as QuickBooksAuth;
    // Convert ISO date string back to Date object
    authData.expiresAt = new Date(authData.expiresAt);
    
    // Store auth in localStorage
    localStorage.setItem('quickbooks_auth', JSON.stringify(authData));
    
    return authData;
  } catch (error) {
    console.error('Error processing auth data:', error);
    return null;
  }
}

/**
 * Fetch invoices from QuickBooks API
 */
export async function fetchInvoices(auth: QuickBooksAuth): Promise<Invoice[]> {
  // Check if token is expired and refresh if needed
  const currentAuth = await ensureValidToken(auth);
  
  // QuickBooks API endpoint for invoices
  const apiUrl = `https://quickbooks.api.intuit.com/v3/company/${currentAuth.realmId}/query`;
  
  // Query for invoices
  const response = await axios.post(
    apiUrl,
    { query: "SELECT * FROM Invoice" },
    {
      headers: {
        'Authorization': `Bearer ${currentAuth.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/text',
      },
    }
  );
  
  // Transform response to our Invoice interface
  return response.data.QueryResponse.Invoice.map((invoice: any) => ({
    id: invoice.Id,
    customerRef: {
      value: invoice.CustomerRef.value,
      name: invoice.CustomerRef.name,
    },
    dueDate: invoice.DueDate,
    totalAmount: invoice.TotalAmt,
    balance: invoice.Balance,
    status: invoice.status,
  }));
}

/**
 * Ensure we have a valid token, refreshing if necessary
 */
async function ensureValidToken(auth: QuickBooksAuth): Promise<QuickBooksAuth> {
  // Check if token is expired
  if (new Date() >= auth.expiresAt) {
    // Token is expired, refresh it
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    
    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: auth.refreshToken,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')}`,
        },
      }
    );
    
    // Calculate new expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + response.data.expires_in);
    
    // Update auth object
    const updatedAuth: QuickBooksAuth = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || auth.refreshToken,
      expiresAt,
      realmId: auth.realmId,
    };
    
    // Update stored auth
    localStorage.setItem('quickbooks_auth', JSON.stringify(updatedAuth));
    
    return updatedAuth;
  }
  
  // Token is still valid
  return auth;
}

/**
 * Generate a random state string for CSRF protection
 */
function generateRandomState(): string {
  return Math.random().toString(36).substring(2);
}