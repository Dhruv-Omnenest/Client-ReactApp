import { useEffect, useRef } from "react";
import { useStockStore } from "../store/stockStore";
import type { Stock } from "../types/stockTypes";

const SERVER_URL = "ws://localhost:8080";

export function useWebSocket() {
    const wsRef = useRef<WebSocket | null>(null);
    const retryCountRef = useRef<number>(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { setStock, setConnected } = useStockStore();

    function getWaitTime(): number {
        const seconds = Math.pow(2, retryCountRef.current);
        return Math.min(seconds, 30) * 1000;
    }

    function connect() {
        console.log(`Connecting to ${SERVER_URL}...`);
        if (wsRef.current) wsRef.current.close();

        const ws = new WebSocket(SERVER_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("Connected to Server");
            setConnected(true);
            retryCountRef.current = 0;
        };

        ws.onmessage = (event: MessageEvent) => {
            try {
                const msg = JSON.parse(event.data);

                const rawData = msg.data || msg.stock;

                if (rawData && (msg.type === "SNAPSHOT" || msg.type === "STOCK_UPDATE")) {

                    const formattedStock: Stock = {
                        ...rawData,
                        price: rawData.ltp,
                    };
                    setStock(formattedStock);
                }
            } catch (err) {
                console.error("Parse error:", err);
            }
        };
        ws.onclose = (e) => {
            setConnected(false);
            console.log(e);
            if (wsRef.current === null) return;

            const waitTime = getWaitTime();
            retryCountRef.current += 1;
            console.log(`Disconnected. Retrying in ${waitTime / 1000}s...`);
            retryTimerRef.current = setTimeout(connect, waitTime);
        };

        ws.onerror = (error) => {
            console.error("WebSocket Error:", error);
        };
    }

    useEffect(() => {
        connect();
        return () => {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            const ws = wsRef.current;
            wsRef.current = null;
            if (ws) ws.close();
        };
    }, []);
}