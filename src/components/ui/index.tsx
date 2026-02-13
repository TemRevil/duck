import React, { Fragment, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '../../utils';

// ============================================================
// Glass Button
// ============================================================

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'ghost';
    className?: string;
    children: React.ReactNode;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
    ({ variant = 'default', className, children, ...props }, ref) => {
        const baseClass = "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2";

        const variants = {
            default: "glass-button",
            primary: "glass-button-primary shadow-lg hover:shadow-tropical-teal/30",
            ghost: "text-shadow-grey/70 dark:text-white/60 hover:text-tropical-teal dark:hover:text-pearl-aqua hover:bg-tropical-teal/5 dark:hover:bg-white/5 border border-transparent hover:border-tropical-teal/20"
        };

        return (
            <button
                ref={ref}
                className={cn(baseClass, variants[variant], className)}
                {...props}
            >
                {children}
            </button>
        );
    }
);
GlassButton.displayName = 'GlassButton';

// ============================================================
// Glass Card
// ============================================================

interface GlassCardProps extends HTMLMotionProps<"div"> {
    variant?: 'default' | 'solid';
    className?: string;
    children: React.ReactNode;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ variant = 'default', className, children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                className={cn(
                    variant === 'default' ? 'glass-card' : 'glass-card-solid',
                    'p-6 transition-all duration-300',
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);
GlassCard.displayName = 'GlassCard';

// ============================================================
// Glass Modal
// ============================================================

interface GlassModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    className,
}) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-shadow-grey/30 dark:bg-black/40 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel
                                className={cn(
                                    "w-full max-w-md md:max-w-2xl lg:max-w-3xl transform overflow-hidden rounded-[2.5rem] p-4 md:p-8 text-left align-middle shadow-2xl transition-all",
                                    "bg-mint-cream/90 dark:bg-[#1a1a1d] backdrop-blur-2xl border border-tropical-teal/10 dark:border-white/10",
                                    className
                                )}
                            >
                                <DialogTitle
                                    as="h3"
                                    className="text-lg font-bold leading-6 text-shadow-grey dark:text-white flex justify-between items-center mb-4"
                                >
                                    {title}
                                    <button
                                        onClick={onClose}
                                        className="p-1 rounded-full hover:bg-tropical-teal/10 dark:hover:bg-white/10 text-taupe-grey dark:text-white/60 hover:text-shadow-grey dark:hover:text-white transition-colors no-drag"
                                    >
                                        <X size={20} />
                                    </button>
                                </DialogTitle>

                                <div className="mt-4 flex-1 min-h-0 overflow-hidden">
                                    {children}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

// ============================================================
// Gradient Background
// ============================================================

interface GradientBackgroundProps {
    children?: ReactNode;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-mint-cream dark:bg-premium-dark relative overflow-hidden transition-colors duration-500 app-region-drag">
            {/* Background Orbs */}
            <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-pearl-aqua/20 to-tropical-teal/20 dark:from-pearl-aqua/5 dark:to-tropical-teal/5 blur-[100px] pointer-events-none animate-pulse-slow" />
            <div className="fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-tropical-teal/10 to-pearl-aqua/10 dark:from-tropical-teal/5 dark:to-pearl-aqua/5 blur-[80px] pointer-events-none animate-pulse-slower" />
            <div className="fixed top-[40%] left-[20%] w-[300px] h-[300px] rounded-full bg-pearl-aqua/10 dark:bg-pearl-aqua/5 blur-[60px] pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 w-full h-full no-drag">
                {children}
            </div>
        </div>
    );
};
