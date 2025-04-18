import { NextRequest, NextResponse } from 'next/server';
import { conversationAnalyzer, parseAnalysisOutput } from '@/app/utils/langchain';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { conversation } = body;

    // Validate the input
    if (!conversation || typeof conversation !== 'string' || conversation.trim() === '') {
      return NextResponse.json(
        { error: 'Conversation text is required' },
        { status: 400 }
      );
    }

    // Analyze the conversation using LangChain
    const result = await conversationAnalyzer.invoke({
      conversation,
    });

    // Parse the result
    const parsedResult = parseAnalysisOutput(result);

    // Return the result
    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    return NextResponse.json(
      { error: 'Failed to analyze conversation' },
      { status: 500 }
    );
  }
}
