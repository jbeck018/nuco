'use client';

/**
 * Function Calling Demo Component
 * 
 * This component demonstrates the use of OpenAI function calling.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

// Define the weather function schema
const weatherFunction = {
  name: 'get_weather',
  description: 'Get the current weather for a location',
  parameters: {
    location: {
      type: 'string',
      description: 'The city and state, e.g. San Francisco, CA',
    },
    unit: {
      type: 'string',
      enum: ['celsius', 'fahrenheit'],
      description: 'The unit of temperature',
    },
  },
  required: ['location'],
};

// Define the calculator function schema
const calculatorFunction = {
  name: 'calculate',
  description: 'Perform a calculation',
  parameters: {
    operation: {
      type: 'string',
      enum: ['add', 'subtract', 'multiply', 'divide'],
      description: 'The operation to perform',
    },
    a: {
      type: 'number',
      description: 'The first number',
    },
    b: {
      type: 'number',
      description: 'The second number',
    },
  },
  required: ['operation', 'a', 'b'],
};

// Mock function implementations
const getWeather = (location: string, unit: string = 'celsius') => {
  // This is a mock implementation
  const temperatures = {
    'New York, NY': { celsius: 22, fahrenheit: 72 },
    'San Francisco, CA': { celsius: 18, fahrenheit: 64 },
    'Miami, FL': { celsius: 30, fahrenheit: 86 },
    'Chicago, IL': { celsius: 15, fahrenheit: 59 },
    'Los Angeles, CA': { celsius: 24, fahrenheit: 75 },
  };

  const defaultTemp = { celsius: 20, fahrenheit: 68 };
  const temp = temperatures[location as keyof typeof temperatures] || defaultTemp;
  
  return {
    location,
    temperature: temp[unit as keyof typeof temp],
    unit,
    condition: ['sunny', 'cloudy', 'rainy', 'stormy'][Math.floor(Math.random() * 4)],
  };
};

const calculate = (operation: string, a: number, b: number) => {
  switch (operation) {
    case 'add':
      return { result: a + b };
    case 'subtract':
      return { result: a - b };
    case 'multiply':
      return { result: a * b };
    case 'divide':
      return { result: a / b };
    default:
      return { error: 'Invalid operation' };
  }
};

interface FunctionCallingDemoProps {
  userId: string;
}

export function FunctionCallingDemo({ userId }: FunctionCallingDemoProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    setResponse('');
    
    try {
      // This is where we would call the API with function calling
      // For now, we'll just simulate a response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if the prompt is asking for weather
      if (prompt.toLowerCase().includes('weather')) {
        const location = prompt.match(/weather in ([a-zA-Z\s,]+)/i)?.[1] || 'San Francisco, CA';
        const unit = prompt.toLowerCase().includes('fahrenheit') ? 'fahrenheit' : 'celsius';
        
        const weatherData = getWeather(location, unit);
        setResponse(`The weather in ${weatherData.location} is ${weatherData.condition} with a temperature of ${weatherData.temperature}°${unit === 'celsius' ? 'C' : 'F'}.`);
      } 
      // Check if the prompt is asking for a calculation
      else if (prompt.toLowerCase().match(/calculate|add|subtract|multiply|divide/)) {
        const numbers = prompt.match(/\d+/g)?.map(Number) || [0, 0];
        let operation = 'add';
        
        if (prompt.toLowerCase().includes('subtract')) operation = 'subtract';
        else if (prompt.toLowerCase().includes('multiply')) operation = 'multiply';
        else if (prompt.toLowerCase().includes('divide')) operation = 'divide';
        
        const result = calculate(operation, numbers[0], numbers[1]);
        setResponse(`The result of the calculation is ${result.result}.`);
      } 
      // Default response
      else {
        setResponse('I can help you with weather information or calculations. Try asking about the weather in a city or to perform a calculation.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Function Calling Demo</CardTitle>
        <CardDescription>
          Try asking about the weather in a city or to perform a calculation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Your prompt</Label>
            <Textarea
              id="prompt"
              placeholder="e.g., What's the weather in San Francisco? or Calculate 25 + 17"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          {response && (
            <div className="space-y-2">
              <Label htmlFor="response">Response</Label>
              <div 
                id="response" 
                className="p-4 rounded-md bg-muted min-h-[100px] whitespace-pre-wrap"
              >
                {response}
              </div>
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          type="submit" 
          onClick={handleSubmit} 
          disabled={loading || !prompt.trim()}
          className="w-full"
        >
          {loading ? 'Processing...' : 'Submit'}
        </Button>
      </CardFooter>
    </Card>
  );
} 