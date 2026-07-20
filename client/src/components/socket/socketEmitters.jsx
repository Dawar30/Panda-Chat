import Socket from "./socket";

export const emitUserOnline = (userId) => {
  Socket.emit("user:online", { userId });
};

export const emitGetConversations = (userId) => {
  Socket.emit("conversations:get", { userId });
};

export const emitGetMessages = (conversationId) => {
  Socket.emit("messages:get", { conversationId });
};

export const emitSendMessage = (receiverId, text, file = null, callback) => {
  Socket.emit("message:send", { receiverId, text, file }, (res) => {
    console.log("Message send response:", res);
    if (callback) callback(res);
  });
};
