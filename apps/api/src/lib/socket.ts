import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { parseCorsOrigins } from "./cors.js";
import { verifyAuthToken } from "./jwt.js";

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer) {
  const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);
  const isDev = process.env.NODE_ENV !== "production";

  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    path: "/socket.io",
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("Authentication required"));
      return;
    }
    try {
      const payload = verifyAuthToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const role = socket.data.role as string;

    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);
    socket.join("global");

    if (isDev) {
      console.log(`[socket] connected user:${userId} role:${role}`);
    }

    socket.on("disconnect", () => {
      if (isDev) {
        console.log(`[socket] disconnected user:${userId}`);
      }
    });
  });

  return io;
}

export function getIO() {
  return io;
}
