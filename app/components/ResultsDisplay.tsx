'use client';

interface BusinessIdea {
  title: string;
  description: string;
  painPoints: string[];
  solution: string;
  viabilityScore: number;
  reasonsToPay: string[];
}

export default function ResultsDisplay({
  ideas,
  isLoading
}: {
  ideas: BusinessIdea[] | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-gray-900 rounded-lg border border-gray-800 mt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-800 rounded w-1/4"></div>
          <div className="h-4 bg-gray-800 rounded w-full"></div>
          <div className="h-4 bg-gray-800 rounded w-5/6"></div>
          <div className="h-4 bg-gray-800 rounded w-3/4"></div>
          <div className="h-10 bg-gray-800 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!ideas || ideas.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-900 rounded-lg border border-gray-800 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-white">Business Opportunities</h2>

      <div className="space-y-8">
        {ideas.map((idea, index) => (
          <div key={index} className="border border-gray-700 rounded-lg p-4 bg-gray-800">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold text-white">{idea.title}</h3>
              <span className="px-2 py-1 bg-blue-900 text-blue-100 text-sm font-medium rounded">
                Viability: {idea.viabilityScore}/10
              </span>
            </div>

            <p className="mt-2 text-gray-300">{idea.description}</p>

            <div className="mt-4">
              <h4 className="font-medium text-gray-100">Pain Points:</h4>
              <ul className="list-disc pl-5 mt-1">
                {idea.painPoints.map((point, i) => (
                  <li key={i} className="text-gray-300">{point}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <h4 className="font-medium text-gray-100">Solution:</h4>
              <p className="text-gray-300">{idea.solution}</p>
            </div>

            <div className="mt-4">
              <h4 className="font-medium text-gray-100">Why People Would Pay:</h4>
              <ul className="list-disc pl-5 mt-1">
                {idea.reasonsToPay.map((reason, i) => (
                  <li key={i} className="text-gray-300">{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
