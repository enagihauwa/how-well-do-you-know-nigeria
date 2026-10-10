import WebSocket from "ws";
import type { ClientAction } from "@naija/game/room/engine";
import type { ServerMessage } from "@naija/game/room/protocol";

export interface PhoneOptions {
  port: number;
  code: string;
  id: string;
  secret?: string;
  name?: string;
  /** Account session token, sent in the hello. */
  token?: string;
}

/** A phone: a real WebSocket plus every message it received. */
export class TestPhone {
  ws: WebSocket;
  messages: ServerMessage[] = [];
  closeCode: Promise<number>;
  id: string;
  constructor({ port, code, id, secret = `${id}-secret-0123456789`, name = id, token }: PhoneOptions) {
    this.id = id;
    this.ws = new WebSocket(`ws://localhost:${port}/rooms/${code}`);
    this.ws.on("message", (data) => this.messages.push(JSON.parse(data.toString())));
    this.ws.on("open", () => this.ws.send(JSON.stringify({ type: "hello", playerId: id, secret, name, ...(token && { token }) })));
    this.closeCode = new Promise((resolve) => this.ws.on("close", (code) => resolve(code)));
  }
  act(action: ClientAction) {
    this.ws.send(JSON.stringify({ type: "action", action }));
  }
  get view() {
    return [...this.messages].reverse().find((m) => m.type === "view")?.view ?? null;
  }
  get chat() {
    return this.messages.flatMap((m) => (m.type === "chat" ? m.messages.map((c) => c.text) : []));
  }
  async until<T>(check: () => T | null | undefined | false, ms = 2000): Promise<T> {
    const end = Date.now() + ms;
    for (;;) {
      const value = check();
      if (value) return value;
      if (Date.now() > end) throw new Error(`${this.id}: timed out; last: ${JSON.stringify(this.messages.at(-1))}`);
      await new Promise((r) => setTimeout(r, 10));
    }
  }
}
