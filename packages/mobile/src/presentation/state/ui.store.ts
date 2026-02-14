import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
    message: string;
    type: ToastType;
    visible: boolean;
}

interface UIState {
    toast: ToastState | null;
    showToast: (message: string, type: ToastType, duration?: number) => void;
    hideToast: () => void;
}

let timeoutId: NodeJS.Timeout;

export const useUIStore = create<UIState>((set) => ({
    toast: null,
    showToast: (message, type, duration = 4000) => {
        if (timeoutId) clearTimeout(timeoutId);

        set({ toast: { message, type, visible: true } });

        timeoutId = setTimeout(() => {
            set((state) => ({
                toast: state.toast ? { ...state.toast, visible: false } : null,
            }));
        }, duration);
    },
    hideToast: () => {
        if (timeoutId) clearTimeout(timeoutId);
        set((state) => ({
            toast: state.toast ? { ...state.toast, visible: false } : null,
        }));
    },
}));
