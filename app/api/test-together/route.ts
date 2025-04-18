import { NextResponse } from 'next/server';
import { chatModel } from '@/app/utils/langchain';

export async function GET() {
  try {
    // Test the Together AI model with a simple prompt
    const result = await chatModel.invoke("Hello, can you confirm that you're working correctly?");
    
    return NextResponse.json({
      success: true,
      message: "Together API is configured correctly",
      result: result.content
    });
  } catch (error) {
    console.error('Error testing Together API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Failed to connect to Together API"
      },
      { status: 500 }
    );
  }
}
