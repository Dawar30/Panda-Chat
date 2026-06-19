import { redisPub, redisSub, isRedisReady } from "../../config/redis.js";

// ─────────────────────────────────────────────────────────────
// Channel Names
// ─────────────────────────────────────────────────────────────

export const CHANNELS = {
  // Direct Messages
  MESSAGE_NEW: "chat:message:new",
  MESSAGE_REPLY: "chat:message:reply",
  READ_RECEIPT: "chat:read",
  TYPING: "chat:typing",

  // Presence
  STATUS_CHANGE: "chat:status",
  PRESENCE: "chat:presence",

  // Groups
  GROUP_CREATED: "group:created",
  GROUP_DELETED: "group:deleted",

  GROUP_MEMBER_ADDED: "group:member:added",
  GROUP_MEMBER_REMOVED: "group:member:removed",

  GROUP_MESSAGE_NEW: "group:message:new",
  GROUP_MESSAGE_REPLY: "group:message:reply",
  GROUP_MESSAGE_UPDATED: "group:message:updated",
  GROUP_MESSAGE_DELETED: "group:message:deleted",
  GROUP_MESSAGE_READ: "group:message:read",

  GROUP_TYPING: "group:typing",
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const emitToUser = (io, userConnections, userId, event, payload) => {
  const socketId = userConnections.get(userId);

  if (!socketId) return;

  io.to(socketId).emit(event, payload);
};

// If you later move to:
// Map<userId, Set<socketId>>
//
// Replace helper with:
//
// const emitToUser = (io, userConnections, userId, event, payload) => {
//   const sockets = userConnections.get(userId);
//   if (!sockets) return;
//
//   sockets.forEach(socketId => {
//     io.to(socketId).emit(event, payload);
//   });
// };

// ─────────────────────────────────────────────────────────────
// Publish
// ─────────────────────────────────────────────────────────────

export const publish = async (channel, payload) => {
  if (!isRedisReady()) return;

  try {
    await redisPub.publish(
      channel,
      JSON.stringify(payload)
    );
  } catch (error) {
    console.error(
      `pubsubService.publish(${channel}) failed:`,
      error.message
    );
  }
};

// ─────────────────────────────────────────────────────────────
// Subscribe
// ─────────────────────────────────────────────────────────────

export const subscribe = async (channel, handler) => {
  if (!isRedisReady()) return;

  try {
    await redisSub.subscribe(channel, (message) => {
      try {
        const payload = JSON.parse(message);
        handler(payload);
      } catch (error) {
        console.error(
          `pubsubService handler(${channel}) parse error:`,
          error.message
        );
      }
    });

    console.log(`Subscribed to channel: ${channel}`);
  } catch (error) {
    console.error(
      `pubsubService.subscribe(${channel}) failed:`,
      error.message
    );
  }
};

// ─────────────────────────────────────────────────────────────
// Initialize Subscriptions
// ─────────────────────────────────────────────────────────────

export const initSubscriptions = async (
  io,
  userConnections
) => {
  if (!isRedisReady()) {
    console.log(
      "Redis not ready — skipping Pub/Sub subscriptions"
    );
    return;
  }

  // ==========================================================
  // DIRECT MESSAGES
  // ==========================================================

  await subscribe(
    CHANNELS.MESSAGE_NEW,
    ({ receiverId, message }) => {
      emitToUser(
        io,
        userConnections,
        receiverId,
        "message:new",
        message
      );
    }
  );

  await subscribe(
    CHANNELS.MESSAGE_REPLY,
    ({ receiverId, message }) => {
      emitToUser(
        io,
        userConnections,
        receiverId,
        "message:reply",
        message
      );
    }
  );

  // ==========================================================
  // READ RECEIPTS
  // ==========================================================

  await subscribe(
    CHANNELS.READ_RECEIPT,
    ({ senderId, messageId }) => {
      emitToUser(
        io,
        userConnections,
        senderId,
        "message:read:update",
        { messageId }
      );
    }
  );

  // ==========================================================
  // TYPING
  // ==========================================================

  await subscribe(
    CHANNELS.TYPING,
    ({ targetId, userId, action }) => {
      emitToUser(
        io,
        userConnections,
        targetId,
        action === "start"
          ? "typing:start"
          : "typing:stop",
        { userId }
      );
    }
  );

  // ==========================================================
  // USER STATUS
  // ==========================================================

  await subscribe(
    CHANNELS.STATUS_CHANGE,
    (payload) => {
      io.emit("user:status", payload);
    }
  );

  // ==========================================================
  // ONLINE USERS
  // ==========================================================

  await subscribe(
    CHANNELS.PRESENCE,
    (payload) => {
      io.emit("users:online", payload);
    }
  );

  // ==========================================================
  // GROUP CREATED
  // ==========================================================

  await subscribe(
    CHANNELS.GROUP_CREATED,
    ({ memberIds, group }) => {
      memberIds?.forEach((memberId) => {
        emitToUser(
          io,
          userConnections,
          memberId,
          "group:created",
          group
        );
      });
    }
  );

  // ==========================================================
  // GROUP DELETED
  // ==========================================================

  await subscribe(
    CHANNELS.GROUP_DELETED,
    ({ memberIds, groupId }) => {
      memberIds?.forEach((memberId) => {
        emitToUser(
          io,
          userConnections,
          memberId,
          "group:deleted",
          { groupId }
        );
      });
    }
  );

  // ==========================================================
  // GROUP MEMBER ADDED
  // ==========================================================

  await subscribe(
    CHANNELS.GROUP_MEMBER_ADDED,
    ({
      groupId,
      newMemberId,
      group,
    }) => {
      io.to(groupId).emit(
        "group:member:added",
        {
          groupId,
          newMemberId,
          group,
        }
      );

      emitToUser(
        io,
        userConnections,
        newMemberId,
        "group:member:added",
        {
          groupId,
          newMemberId,
          group,
        }
      );
    }
  );

  // ==========================================================
  // GROUP MEMBER REMOVED
  // ==========================================================

  await subscribe(
    CHANNELS.GROUP_MEMBER_REMOVED,
    ({
      groupId,
      removedMemberId,
      group,
    }) => {
      io.to(groupId).emit(
        "group:member:removed",
        {
          groupId,
          removedMemberId,
          group,
        }
      );

      emitToUser(
        io,
        userConnections,
        removedMemberId,
        "group:member:removed",
        {
          groupId,
          removedMemberId,
        }
      );
    }
  );

  // ==========================================================
  // GROUP MESSAGE NEW
  // ==========================================================

  await subscribe(
    CHANNELS.GROUP_MESSAGE_NEW,
    ({ groupId, message }) => {
      io.to(groupId).emit(
        "group:message:new",
        message
      );
    }
  );

  await subscribe(
    CHANNELS.GROUP_MESSAGE_REPLY,
    ({ groupId, message }) => {
      io.to(groupId).emit(
        "group:message:reply",
        message
      );
    }
  );

  // ==========================================================
  // GROUP MESSAGE UPDATED
  // ==========================================================

  await subscribe(
    CHANNELS.GROUP_MESSAGE_UPDATED,
    ({ groupId, message }) => {
      io.to(groupId).emit(
        "group:message:updated",
        message
      );
    }
  );

  // ==========================================================
  // GROUP MESSAGE DELETED
  // ==========================================================

  await subscribe(
    CHANNELS.GROUP_MESSAGE_DELETED,
    ({ groupId, messageId }) => {
      io.to(groupId).emit(
        "group:message:deleted",
        { messageId }
      );
    }
  );

  // ==========================================================
  // GROUP MESSAGE READ
  // ==========================================================

  await subscribe(
    CHANNELS.GROUP_MESSAGE_READ,
    ({
      groupId,
      messageId,
      userId,
      readCount,
    }) => {
      io.to(groupId).emit(
        "group:message:read:update",
        {
          messageId,
          userId,
          readCount,
        }
      );
    }
  );

  // ==========================================================
  // GROUP TYPING
  // ==========================================================

  await subscribe(
    CHANNELS.GROUP_TYPING,
    ({
      groupId,
      userId,
      action,
    }) => {
      io.to(groupId).emit(
        action === "start"
          ? "group:typing:start"
          : "group:typing:stop",
        {
          groupId,
          userId,
        }
      );
    }
  );

  console.log(
    "All Pub/Sub subscriptions initialized"
  );
};