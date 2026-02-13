import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'ar' | 'auto';

interface SettingsState {
    theme: Theme;
    language: Language; // UI language
    primaryTranscriptionLanguage: string;
    secondaryTranscriptionLanguage: string;
    notificationsEnabled: boolean;

    setTheme: (theme: Theme) => void;
    setLanguage: (lang: Language) => void;
    setPrimaryTranscriptionLanguage: (lang: string) => void;
    setSecondaryTranscriptionLanguage: (lang: string) => void;
    toggleNotifications: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            theme: 'light',
            language: 'en',
            primaryTranscriptionLanguage: 'en',
            secondaryTranscriptionLanguage: '',
            notificationsEnabled: true,
            setTheme: (theme) => set({ theme }),

            setLanguage: (language) => {
                set({ language });
                document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.lang = language;
            },

            setPrimaryTranscriptionLanguage: (primaryTranscriptionLanguage) => set({ primaryTranscriptionLanguage }),
            setSecondaryTranscriptionLanguage: (secondaryTranscriptionLanguage) => set({ secondaryTranscriptionLanguage }),

            toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
        }),
        {
            name: 'duck-settings',
        }
    )
);
