import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChatPresenceService {
  private readonly logger = new Logger(ChatPresenceService.name);
  private readonly userSockets = new Map<string, Set<string>>();

  registerConnection(userId: string, socketId: string) {
    const activeSockets = this.userSockets.get(userId) ?? new Set<string>();
    const wasOnline = activeSockets.size > 0;

    activeSockets.add(socketId);
    this.userSockets.set(userId, activeSockets);

    this.logger.debug(
      `presence_connected userId=${userId} sockets=${activeSockets.size}`,
    );

    return !wasOnline;
  }

  unregisterConnection(userId: string, socketId: string) {
    const activeSockets = this.userSockets.get(userId);

    if (!activeSockets) {
      return false;
    }

    activeSockets.delete(socketId);

    if (!activeSockets.size) {
      this.userSockets.delete(userId);
      this.logger.debug(`presence_disconnected userId=${userId} sockets=0`);
      return true;
    }

    this.logger.debug(
      `presence_socket_removed userId=${userId} sockets=${activeSockets.size}`,
    );

    return false;
  }

  isUserOnline(userId?: string | null) {
    if (!userId) {
      return false;
    }

    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }
}
