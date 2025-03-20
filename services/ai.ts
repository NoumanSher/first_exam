// services/ai.ts
import { Message, QuickBooksAuth } from '../types';
import { fetchInvoices } from './quickbooks';

// Replace with your AI API key
const AI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Generate AI response with optional QuickBooks data access
 */
export async function generateAIResponse(messages: Message[], quickBooksAuth?: QuickBooksAuth): Promise<string> {
  // Check if the user is asking about invoices
  const lastUserMessage = messages.filter(m => m.sender === 'user').pop();
  
  if (!lastUserMessage) {
    return "Hello! I'm your QuickBooks assistant. How can I help you today?";
  }
  
  const invoiceRelatedTerms = [
    'invoice', 'invoices', 'bill', 'bills', 'payment', 'payments',
    'customer', 'customers', 'due', 'overdue', 'balance'
  ];
  
  const isInvoiceRelated = invoiceRelatedTerms.some(term => 
    lastUserMessage.content.toLowerCase().includes(term)
  );
  
  // If the query is invoice-related and we have QuickBooks auth, fetch invoice data
  let invoiceData = null;
  if (isInvoiceRelated && quickBooksAuth) {
    try {
      invoiceData = await fetchInvoices(quickBooksAuth);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  }
  
  // Format the conversation history for the AI
  const formattedMessages = messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));
  
  // Add system message with context about QuickBooks connection status
  const systemMessage = {
    role: 'system',
    content: quickBooksAuth 
      ? 'You are an AI assistant with access to QuickBooks invoice data. Help the user with their financial questions.'
      : 'You are an AI assistant that can help with financial questions. Note that you do not have access to QuickBooks data because the user has not connected their account yet.'
  };
  
  // If we have invoice data, add it to the prompt
  let invoiceContext = '';
  if (invoiceData && invoiceData.length > 0) {
    invoiceContext = 'Here is the latest invoice data from QuickBooks:\n\n' + 
      JSON.stringify(invoiceData, null, 2) + 
      '\n\nUse this data to answer the user\'s question.';
    
    // Add invoice data as a system message
    formattedMessages.push({
      role: 'system',
      content: invoiceContext
    });
  }
  
  // Make the API call to your AI provider (OpenAI example)
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4', // or whatever model you prefer
        messages: [systemMessage, ...formattedMessages],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    console.log(data)
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    } else {
      throw new Error('Invalid response from AI service');
    }
  } catch (error) {
    console.error('Error calling AI service:', error);
    
    if (!quickBooksAuth && isInvoiceRelated) {
      return "I'd be happy to help with that, but you'll need to connect your QuickBooks account first to access your invoice data.";
    } else {
      return "I'm sorry, I encountered an error processing your request. Please try again.";
    }
  }
}