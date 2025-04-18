'use client';

interface StepperProps {
  currentStep: number;
  steps: string[];
}

export default function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 
                ${index < currentStep 
                  ? 'bg-green-600 border-green-600 text-white' 
                  : index === currentStep 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-gray-800 border-gray-600 text-gray-400'
                }`}
            >
              {index < currentStep ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span 
              className={`mt-2 text-sm ${
                index <= currentStep ? 'text-white' : 'text-gray-500'
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
      
      <div className="relative mt-2">
        <div className="absolute top-0 h-1 w-full bg-gray-700">
          <div 
            className="h-1 bg-blue-600 transition-all duration-300" 
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
