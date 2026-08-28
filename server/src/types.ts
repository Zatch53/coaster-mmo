export interface Piece {
  id: string;
  parkId: string;
  type: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  color: string;
  ownerName: string;
  createdAt: number;
}

export type ClientMessage =
  | { kind: "place_piece"; piece: Omit<Piece, "id" | "parkId" | "createdAt"> }
  | { kind: "remove_piece"; id: string }
  | { kind: "cursor"; x: number; y: number; name: string; color: string };

export type ServerMessage =
  | { kind: "init"; pieces: Piece[]; peers: PeerInfo[] }
  | { kind: "piece_added"; piece: Piece }
  | { kind: "piece_removed"; id: string }
  | { kind: "cursor"; peerId: string; x: number; y: number; name: string; color: string }
  | { kind: "peer_joined"; peer: PeerInfo }
  | { kind: "peer_left"; peerId: string };

export interface PeerInfo {
  id: string;
  name: string;
  color: string;
}
