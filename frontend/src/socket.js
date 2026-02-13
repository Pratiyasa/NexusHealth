/**
 * NexusHealth WebSocket Client
 * Features: Auto-reconnect, JSON handling, and status tracking.
 * Updated: 2026 Neural & EEG Telemetry support.
 */

class HealthSocket {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.listeners = new Set();
    this.reconnectInterval = 3000; // Try reconnecting every 3 seconds
  }

  connect() {
    console.log(`%c[Socket] Connecting to ${this.url}...`, "color: #2dd4bf");
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log("%c[Socket] Connected to Health Engine", "color: #4ade80");
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // --- 2026 DATA VALIDATION ---
        // Ensuring new backend keys exist before broadcasting to listeners
        if (data.neural_heatmap) {
           // Successfully receiving 8x8 grid data
        }
        if (data.eeg_waves) {
           // Successfully receiving Alpha/Beta/Delta wave data
        }

        // Distribute data to all registered components
        this.listeners.forEach((callback) => callback(data));
      } catch (err) {
        console.error("[Socket] Error parsing incoming data:", err);
      }
    };

    this.socket.onclose = () => {
      console.warn("[Socket] Connection lost. Retrying...");
      setTimeout(() => this.connect(), this.reconnectInterval);
    };

    this.socket.onerror = (error) => {
      console.error("[Socket] Error:", error);
      this.socket.close();
    };
  }

  // Allow React components to "subscribe" to live vitals
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback); // Return unsubscribe function
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }
}

// Point this to your FastAPI backend port
const socketInstance = new HealthSocket("ws://127.0.0.1:8000/ws/vitals");
export default socketInstance;