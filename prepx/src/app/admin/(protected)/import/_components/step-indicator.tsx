import { Check } from 'lucide-react';

interface StepIndicatorProps {
  steps: Array<{ label: string; description?: string }>;
  currentStep: number;
}

/** Displays import workflow progress horizontally on desktop and vertically on mobile. */
export function StepIndicator({ steps, currentStep }: StepIndicatorProps): React.JSX.Element {
  return (
    <ol aria-label="Import progress" className="flex flex-col gap-0 md:flex-row md:items-start">
      {steps.map((step, index) => {
        const number = index + 1;
        const complete = number < currentStep;
        const current = number === currentStep;
        return (
          <li
            key={step.label}
            aria-current={current ? 'step' : undefined}
            className="relative flex min-h-16 flex-1 gap-3 pb-4 last:min-h-0 last:pb-0 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center"
          >
            {index < steps.length - 1 && (
              <span aria-hidden="true" className={`absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-0.5 md:left-[calc(50%+18px)] md:top-[17px] md:h-0.5 md:w-[calc(100%-36px)] ${complete ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
            <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${complete ? 'border-green-500 bg-green-500 text-white' : current ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-400'}`}>
              {complete ? <Check aria-hidden="true" className="h-4 w-4" /> : number}
            </span>
            <span>
              <span className={`block text-sm font-medium ${current ? 'text-blue-700' : complete ? 'text-green-700' : 'text-gray-500'}`}>{step.label}</span>
              {step.description && <span className="mt-0.5 block text-xs text-gray-500">{step.description}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
