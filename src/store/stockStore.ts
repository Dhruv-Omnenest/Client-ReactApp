import { create } from "zustand";
import type { Stock } from "../types/stockTypes";

type StoreState = {
  stocks: Record<string, Stock>;
  isConnected: boolean;
  selectedSymbol: string | null;
  priceHistory: Record<string, number[]>;
  setStock: (stock: Stock) => void;
  setConnected: (value: boolean) => void;
  setSelected: (symbol: string | null) => void;
};

export const useStockStore = create<StoreState>()((set) => ({
  stocks: {},
  isConnected: false,
  selectedSymbol: null,
  priceHistory: {},

  setStock: (stock: Stock) =>
    set((state) => {
      // 1. Safety check: If there's no symbol, don't update
      const symbol = stock.symbol;
      if (!symbol) return state;

      const oldHistory = state.priceHistory[symbol] || [];
      // 2. Add new price and keep only last 30 entries
      const newHistory = [...oldHistory, stock.price].slice(-30);

      return {
        stocks: { 
          ...state.stocks, 
          [symbol]: stock 
        },
        priceHistory: { 
          ...state.priceHistory, 
          [symbol]: newHistory 
        },
      };
    }),

  setConnected: (value: boolean) => set({ isConnected: value }),
  setSelected: (symbol: string | null) => set({ selectedSymbol: symbol }),
}));