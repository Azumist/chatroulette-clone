export interface WsClientRequest {
  id: string;
  command: string;
  message?: string;
}