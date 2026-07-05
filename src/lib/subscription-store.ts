import { create } from "zustand";

interface SubscriptionState {
  expired: boolean;
  setExpired: (v: boolean) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  expired: false,
  setExpired: (v: boolean) => set({ expired: v }),
}));