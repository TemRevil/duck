import React from 'react';
import { GradientBackground } from '../ui';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <GradientBackground>
            <div className="min-h-screen flex flex-col p-4 md:p-8">
                {children}
            </div>
        </GradientBackground>
    );
};
