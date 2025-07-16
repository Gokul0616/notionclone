import { useState, useEffect, useRef, useCallback } from 'react';

interface WSMessage {
  type: string;
  data?: any;
  requestId?: string;
}

interface WSResponse {
  type: string;
  data?: any;
  requestId?: string;
  error?: string;
}

interface WebSocketAPIHook {
  isConnected: boolean;
  isReconnecting: boolean;
  send: (message: WSMessage) => Promise<WSResponse>;
  sendWithoutResponse: (message: WSMessage) => void;
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useWebSocketAPI(): WebSocketAPIHook {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRequests = useRef<Map<string, { resolve: (value: WSResponse) => void; reject: (error: Error) => void }>>(new Map());
  const eventListeners = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 50; // Allow many attempts
  const baseReconnectDelay = 1000; // Start with 1 second
  const maxReconnectDelay = 30000; // Max 30 seconds between attempts
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const generateRequestId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }, []);

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/ws`;
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    
    heartbeatInterval.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const wsUrl = getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttempts.current = 0;
        startHeartbeat();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const response: WSResponse = JSON.parse(event.data);
          
          // Handle responses to pending requests
          if (response.requestId) {
            const pending = pendingRequests.current.get(response.requestId);
            if (pending) {
              pendingRequests.current.delete(response.requestId);
              if (response.error) {
                pending.reject(new Error(response.error));
              } else {
                pending.resolve(response);
              }
              return;
            }
          }

          // Handle broadcast events
          const listeners = eventListeners.current.get(response.type);
          if (listeners) {
            listeners.forEach(callback => {
              try {
                callback(response.data);
              } catch (error) {
                console.error('Error in event listener:', error);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        stopHeartbeat();
        
        // Reject all pending requests
        pendingRequests.current.forEach(({ reject }) => {
          reject(new Error('WebSocket connection closed'));
        });
        pendingRequests.current.clear();

        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            baseReconnectDelay * Math.pow(1.5, reconnectAttempts.current),
            maxReconnectDelay
          );
          
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          setIsReconnecting(true);
          reconnectAttempts.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
          setIsReconnecting(false);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
      setIsReconnecting(false);
    }
  }, [getWebSocketUrl, startHeartbeat, stopHeartbeat]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    reconnectAttempts.current = maxReconnectAttempts; // Prevent auto-reconnect
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsReconnecting(false);
  }, [stopHeartbeat]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  const send = useCallback(async (message: WSMessage): Promise<WSResponse> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const requestId = generateRequestId();
      const messageWithId = { ...message, requestId };

      // Store the promise resolvers
      pendingRequests.current.set(requestId, { resolve, reject });

      // Set timeout for request
      setTimeout(() => {
        if (pendingRequests.current.has(requestId)) {
          pendingRequests.current.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000); // 30 second timeout

      try {
        wsRef.current.send(JSON.stringify(messageWithId));
      } catch (error) {
        pendingRequests.current.delete(requestId);
        reject(error);
      }
    });
  }, [generateRequestId]);

  const sendWithoutResponse = useCallback((message: WSMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    if (!eventListeners.current.has(eventType)) {
      eventListeners.current.set(eventType, new Set());
    }
    
    const listeners = eventListeners.current.get(eventType)!;
    listeners.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        eventListeners.current.delete(eventType);
      }
    };
  }, []);

  useEffect(() => {
    connect();

    // Handle page visibility changes for reconnection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && !isReconnecting) {
        reconnect();
      }
    };

    // Handle online/offline events
    const handleOnline = () => {
      if (!isConnected && !isReconnecting) {
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      disconnect();
    };
  }, []);

  return {
    isConnected,
    isReconnecting,
    send,
    sendWithoutResponse,
    subscribe,
    disconnect,
    reconnect
  };
}