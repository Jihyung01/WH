import { create } from 'zustand';

type ModalType = 'eventPreview' | 'rewardReveal' | 'levelUp' | 'error' | null;

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  activeModal: ModalType;
  modalData: Record<string, unknown> | null;
  toastQueue: Toast[];
  isBottomSheetOpen: boolean;
  isOnboarded: boolean;

  // Actions
  showModal: (type: ModalType, data?: Record<string, unknown>) => void;
  hideModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setBottomSheet: (open: boolean) => void;
  setOnboarded: (onboarded: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  modalData: null,
  toastQueue: [],
  isBottomSheetOpen: false,
  isOnboarded: false,

  showModal: (type, data) => set({ activeModal: type, modalData: data ?? null }),
  hideModal: () => set({ activeModal: null, modalData: null }),
  addToast: (toast) =>
    set((state) => ({
      toastQueue: [...state.toastQueue, { ...toast, id: Date.now().toString() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toastQueue: state.toastQueue.filter((t) => t.id !== id),
    })),
  setBottomSheet: (open) => set({ isBottomSheetOpen: open }),
  setOnboarded: (onboarded) => set({ isOnboarded: onboarded }),
}));
