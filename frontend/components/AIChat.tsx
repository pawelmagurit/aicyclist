'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIChatProps {
  userId: string
}

export function AIChat({ userId }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m your AI cycling coach. I can help you analyze your training data, generate workouts, and create personalized training plans. What would you like to know?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Simulate AI response - in production, this would call your MCP server
      const response = await simulateAIResponse(input.trim(), userId)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-4">
        <Bot className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900">AI Coach</h2>
      </div>

      <div className="h-64 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-xs lg:max-w-md ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex max-w-xs lg:max-w-md">
              <div className="flex-shrink-0 mr-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
              </div>
              <div className="px-4 py-2 rounded-lg bg-gray-100">
                <div className="flex items-center space-x-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about your training..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// Simulate AI response - in production, this would call your MCP server
async function simulateAIResponse(message: string, userId: string): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('ftp') || lowerMessage.includes('power')) {
    return `Based on your recent activities, I estimate your current FTP is around 250W. To improve this, I recommend focusing on threshold intervals at 95% of your FTP for 8-10 minute intervals with 2-3 minute recoveries. Would you like me to generate a specific FTP workout for you?`
  }

  if (lowerMessage.includes('workout') || lowerMessage.includes('training')) {
    return `I can help you create structured workouts! I can generate various types including:\n\n• FTP intervals for threshold training\n• VO2max intervals for high-intensity work\n• Endurance rides for base building\n• Recovery rides for active recovery\n\nWhat type of workout are you looking for?`
  }

  if (lowerMessage.includes('plan') || lowerMessage.includes('program')) {
    return `I can create a personalized training plan based on your goals and current fitness level. I'll analyze your recent activities to determine your strengths and areas for improvement, then design a progressive plan with the right mix of intensity and volume.\n\nWhat's your main goal - increasing FTP, improving endurance, or preparing for a specific event?`
  }

  if (lowerMessage.includes('analyze') || lowerMessage.includes('data')) {
    return `I can analyze your training data to provide insights on:\n\n• Fitness trends and progression\n• Training load and recovery\n• Power zones and efficiency\n• Training consistency\n\nWould you like me to analyze your last 2 weeks of training data?`
  }

  if (lowerMessage.includes('garmin') || lowerMessage.includes('connect')) {
    return `I can help you sync your Garmin Connect data and automatically upload structured workouts to your calendar. This allows you to follow your training plan directly from your Garmin device.\n\nMake sure you're connected to Garmin Connect to get the full experience!`
  }

  return `I understand you're asking about "${message}". I'm here to help with your cycling training! I can assist with workout generation, training plan creation, data analysis, and Garmin Connect integration. What specific aspect of your training would you like to focus on?`
}
