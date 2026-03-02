import { useEffect, useRef } from "react";
import { useStockStore } from "../store/stockStore";
import type { Stock } from "../types/stockTypes";

const SERVER_URL = "ws://localhost:8080";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const isIntentionalClose = useRef(false);
  const retryCountRef = useRef<number>(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setStock, setConnected } = useStockStore();

  function getWaitTime(): number {
    const seconds = Math.pow(2, retryCountRef.current);
    return Math.min(seconds, 30) * 1000;
  }

  function connect() {
    console.log(`Attempting connection to ${SERVER_URL}...`);
    isIntentionalClose.current = false;

    const ws = new WebSocket(SERVER_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(" Connected to Server");
      setConnected(true);
      retryCountRef.current = 0;
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        
        // Handle various wrapper formats (.data, .stock, or root)
        const rawData = msg.data || msg.stock || msg;
        const symbol = msg.symbol || rawData.symbol || rawData.s;

        if (rawData && symbol) {
          const formattedStock: Stock = {
            ...rawData,
            symbol: symbol,
            // 1. Map Price: Check 'value' (Index) vs 'ltp' (Equity)
            price: Number(rawData.value || rawData.ltp || rawData.price || 0),
            
            // 2. Map Volume: Check 'v', 'vol', or 'volume'
            volume: Number(rawData.v || rawData.vol || rawData.volume || 0),
            
            // 3. Map Changes
            change: Number(rawData.change || rawData.c || 0),
            changePercent: Number(rawData.changePercent || rawData.pc || rawData.cp || 0),
          };

          setStock(formattedStock);
        }
      } catch (err) {
        console.error("Parse error in WebSocket message:", err);
      }
    };

    ws.onclose = (e) => {
        console.log(e);
      setConnected(false);
      if (isIntentionalClose.current) {
        console.log("Clean closure. No retry.");
        return;
      }

      const waitTime = getWaitTime();
      retryCountRef.current += 1;
      console.warn(`Socket Closed. Retrying in ${waitTime / 1000}s...`);
      
      retryTimerRef.current = setTimeout(() => {
        connect();
      }, waitTime);
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };
  }

  useEffect(() => {
    connect();

    return () => {
      isIntentionalClose.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);
}