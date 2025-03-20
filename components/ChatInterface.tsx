// components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Message, QuickBooksAuth } from '../types';
import { generateAIResponse } from '../services/ai';
import { v4 as uuidv4 } from 'uuid'; // You'll need to install this package

interface ChatInterfaceProps {
  quickBooksAuth?: QuickBooksAuth;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ quickBooksAuth }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Generate AI response that can access QuickBooks data if needed
      const aiResponse = await generateAIResponse([...messages, userMessage], quickBooksAuth);
      
      const aiMessage: Message = {
        id: uuidv4(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      const errorMessage: Message = {
        id: uuidv4(),
        content: 'Sorry, I encountered an error processing your request.',
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 gap-4">
      <div className="flex-1 overflow-y-auto">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`p-3 rounded-lg mb-2 ${
              message.sender === 'user' 
                ? 'bg-blue-100 ml-auto max-w-[80%]' 
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <p>{message.content}</p>
            <small className="text-xs text-gray-500">
              {message.timestamp.toLocaleTimeString()}
            </small>
          </div>
        ))}
        {isLoading && (
          <div className="bg-gray-100 p-3 rounded-lg mr-auto mb-2">
            <p>Thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask about invoices or financial data..."
          className="flex-1 p-2 border rounded-md"
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
          className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:bg-blue-300"
        >
          Send
        </button>
      </div>
      
      {!quickBooksAuth && (
        <div className="text-center">
          <button className="bg-green-500 text-white px-4 py-2 rounded-md">
            Connect to QuickBooks
          </button>
          <p className="text-sm text-gray-500 mt-1">
            Connect your QuickBooks account to access invoice data
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;