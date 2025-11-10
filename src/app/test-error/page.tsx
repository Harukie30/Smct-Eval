'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Test page to trigger error.tsx
 * 
 * This page demonstrates different ways to trigger the Next.js error boundary.
 * Visit: /test-error
 */
export default function TestErrorPage() {
  const [shouldThrow, setShouldThrow] = useState(false);

  // Method 1: Throw error on render
  if (shouldThrow) {
    throw new Error('This is a test error to trigger error.tsx!');
  }

  // Method 2: Throw error in event handler (won't trigger error.tsx, but shows how)
  const throwErrorInHandler = () => {
    throw new Error('Error in event handler - this won\'t trigger error.tsx');
  };

  // Method 3: Access undefined property (will trigger error)
  const triggerUndefinedError = () => {
    setShouldThrow(true);
  };

  // Method 4: Async error (won't trigger error.tsx directly, but can cause issues)
  const triggerAsyncError = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('Async error');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Error Boundary Test Page</CardTitle>
          <CardDescription>
            This page helps you test the error.tsx error boundary. Click the buttons below to trigger different types of errors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Ways to Trigger error.tsx:</h3>
            
            <div className="space-y-3">
              {/* Method 1: Render Error */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">1. Render Error (Will trigger error.tsx)</h4>
                <p className="text-sm text-gray-600 mb-3">
                  This will throw an error during render, which will be caught by error.tsx
                </p>
                <Button
                  onClick={triggerUndefinedError}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Trigger Render Error
                </Button>
              </div>

              {/* Method 2: Event Handler Error */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">2. Event Handler Error (Won't trigger error.tsx)</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Errors in event handlers won't trigger error.tsx. They need to be caught with try-catch or useErrorHandler.
                </p>
                <Button
                  onClick={() => {
                    try {
                      throwErrorInHandler();
                    } catch (error) {
                      alert('Error caught: ' + (error as Error).message);
                    }
                  }}
                  variant="outline"
                >
                  Trigger Handler Error (Caught)
                </Button>
              </div>

              {/* Method 3: Async Error */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">3. Async Error (Won't trigger error.tsx)</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Async errors need to be caught with try-catch or useErrorHandler hook.
                </p>
                <Button
                  onClick={async () => {
                    try {
                      await triggerAsyncError();
                    } catch (error) {
                      alert('Async error caught: ' + (error as Error).message);
                    }
                  }}
                  variant="outline"
                >
                  Trigger Async Error (Caught)
                </Button>
              </div>

              {/* Method 4: Undefined Property Access */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">4. Undefined Property Access (Will trigger error.tsx)</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Accessing properties on undefined/null will throw an error during render.
                </p>
                <UndefinedAccessComponent />
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> error.tsx only catches errors during:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Component rendering</li>
                <li>Server Components</li>
                <li>Client Components during render phase</li>
              </ul>
              It does NOT catch errors in event handlers or async operations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component that will throw error on render
function UndefinedAccessComponent() {
  const [trigger, setTrigger] = useState(false);

  if (trigger) {
    // This will throw an error during render
    const obj: any = null;
    return <div>{obj.property.nested}</div>; // TypeError: Cannot read property 'property' of null
  }

  return (
    <Button
      onClick={() => setTrigger(true)}
      className="bg-orange-600 hover:bg-orange-700 text-white"
    >
      Trigger Undefined Access Error
    </Button>
  );
}

