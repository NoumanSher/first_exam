// pages/index.tsx
'use client'
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Head from 'next/head';
import ChatInterface from '../components/ChatInterface';
import { QuickBooksAuth } from '../types';
import { initiateQuickBooksAuth, processAuthFromURL } from '../services/quickbooks';

export default function Home() {
  const [quickBooksAuth, setQuickBooksAuth] = useState<QuickBooksAuth | undefined>(undefined);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check for stored QuickBooks auth on page load
  useEffect(() => {
    // First check if we have auth data in the URL
    const authParam = searchParams.get('auth');
    if (authParam) {
      const authData = processAuthFromURL(authParam);
      if (authData) {
        setQuickBooksAuth(authData);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
    }

    // Otherwise check localStorage
    const storedAuth = localStorage.getItem('quickbooks_auth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth) as QuickBooksAuth;
        // Only set if the token is still valid
        if (new Date(authData.expiresAt) > new Date()) {
          setQuickBooksAuth(authData);
        }
      } catch (error) {
        console.error('Error parsing stored QuickBooks auth:', error);
      }
    }
  }, [searchParams]);
  
  const handleConnectQuickBooks = () => {
    initiateQuickBooksAuth();
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Head>
        <title>QuickBooks AI Chat</title>
        <meta name="description" content="Chat with AI about your QuickBooks data" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">QuickBooks AI Chat</h1>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4">
        {!quickBooksAuth ? (
          <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Connect to QuickBooks</h2>
            <p className="mb-6">
              Connect your QuickBooks account to chat with AI about your financial data.
            </p>
            <button
              onClick={handleConnectQuickBooks}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Connect QuickBooks
            </button>
          </div>
        ) : (
          <div className="h-[calc(100vh-12rem)]">
            <ChatInterface quickBooksAuth={quickBooksAuth} />
          </div>
        )}
      </main>
      
      <footer className="bg-gray-100 p-4 text-center text-gray-600">
        <p>QuickBooks AI Chat Interview Project</p>
      </footer>
    </div>
  );
}