import Socket from "./socket";


export const emitGetConversations = (userId, callback, options = {}) => {
  const { timeout = 2000, maxRetries = 3 } = options;
  let attempt = 0;
  let timeoutId;

  const attemptRequest = () => {
    attempt++;
    let acknowledged = false;

    timeoutId = setTimeout(() => {
      if (!acknowledged && attempt < maxRetries) {
        console.log(`emitGetConversations: No acknowledgement, retry ${attempt}/${maxRetries}`);
        attemptRequest();
      } else if (!acknowledged) {
        console.error(`emitGetConversations: No acknowledgement after ${maxRetries} attempts`);
        if (callback) callback({ success: false, error: 'timeout' });
      }
    }, timeout);

    Socket.emit("conversations:get", { userId }, (response) => {
      acknowledged = true;
      clearTimeout(timeoutId);
      if (callback) callback(response);
    });
  };

  attemptRequest();
};

export const emitGetMessages = (conversationId, callback) => {
  Socket.emit("messages:get", { conversationId }, callback);
};

export const emitSendMessage = (receiverId, text, file = null, callback) => {
  Socket.emit("message:send", { receiverId, text, file }, (res) => {
    console.log("Message send response:", res);
    if (callback) callback(res);
  });
};

export const emitReplyMessage = (receiverId, parentMessageId, text, file = null, callback) => {
  Socket.emit("message:reply", { receiverId, parentMessageId, text, file }, (res) => {
    console.log("Message reply response:", res);
    if (callback) callback(res);
  });
};

export const emitGetPresence = (userId, callback) => {
  Socket.emit("presence:get", { userId }, callback);
};

export const emitEditMessage = (messageId, text, callback) => {
  Socket.emit("message:update", { messageId, text }, callback);
};

export const emitDeleteMessage = (messageId, callback) => {
  Socket.emit("message:delete", { messageId }, callback);
};

export const emitTypingStart = (receiverId) => {
  Socket.emit("typing:start", { receiverId });
};

export const emitTypingStop = (receiverId) => {
  Socket.emit("typing:stop", { receiverId });
};
