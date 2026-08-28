import type { ClientMessage, ServerMessage } from "./types";
import { useParkStore } from "./store";

function defaultWsUrl() {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

const WS_URL = import.meta.env.VITE_WS_URL ?? defaultWsUrl();

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function handleMessage(msg: ServerMessage) {
  const store = useParkStore.getState();
  switch (msg.kind) {
    case "init":
      store.setInit(msg.pieces, msg.peers);
      break;
    case "piece_added":
      store.addPiece(msg.piece);
      break;
    case "piece_removed":
      store.removePiece(msg.id);
      break;
    case "peer_joined":
      store.setPeer(msg.peer);
      break;
    case "peer_left":
      store.removePeer(msg.peerId);
      break;
    case "cursor":
      store.setCursor(msg.peerId, { x: msg.x, y: msg.y, name: msg.name, color: msg.color });
      break;
    case "reset":
      store.resetPieces();
      break;
  }
}

export function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  socket = new WebSocket(WS_URL);

  socket.addEventListener("open", () => {
    useParkStore.getState().setConnected(true);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  socket.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data) as ServerMessage;
      handleMessage(msg);
    } catch {
      /* ignore malformed */
    }
  });

  socket.addEventListener("close", () => {
    useParkStore.getState().setConnected(false);
    socket = null;
    reconnectTimer = setTimeout(connect, 1500);
  });

  socket.addEventListener("error", () => {
    socket?.close();
  });
}

export function send(msg: ClientMessage) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}
