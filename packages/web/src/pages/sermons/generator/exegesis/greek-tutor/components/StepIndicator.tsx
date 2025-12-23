import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface Step {
    number: number;
    title: string;
    description: string;
    icon?: LucideIcon;
}

export interface StepIndicatorProps {
    steps: Step[];
}

/**
 * Reusable component for displaying numbered steps with icons.
 * Following Single Responsibility Principle - only renders step sequences.
 * Used in recognition guides and other instructional contexts.
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps }) => {
    return (
        <div className="space-y-4">
            {steps.map((step, idx) => {
                const Icon = step.icon;
                
                return (
                    <Card 
                        key={step.number}
                        className="p-4 hover:shadow-md transition-all duration-300 animate-in slide-in-from-left"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="flex gap-4">
                            {/* Step Number Circle */}
                            <div className="shrink-0">
                                <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                                    <span className="text-sm font-bold text-primary">
                                        {step.number}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    {Icon && (
                                        <div className="w-5 h-5 flex items-center justify-center text-primary">
                                            <Icon className="w-4 h-4" />
                                        </div>
                                    )}
                                    <h4 className="font-semibold text-foreground">
                                        {step.title}
                                    </h4>
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};
