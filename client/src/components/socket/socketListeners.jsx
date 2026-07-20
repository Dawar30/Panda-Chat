import Socket from "./socket";

export const onConversationsGet = (callback) => {
  Socket.on("conversations:get", callback);
};

export const offConversationsGet = () => {
  Socket.off("conversations:get");
};

export const onMessagesGet = (callback) => {
  Socket.on("messages:get", callback);
};

export const offMessagesGet = () => {
  Socket.off("messages:get");
};

export const onMessageNew = (callback) => {
  Socket.on("message:new", callback);
};

export const offMessageNew = (callback) => {
  Socket.off("message:new", callback);
};
export const onUsersOnline = (callback) => {
  Socket.on("users:online", callback);
};

export const offUsersOnline = (callback) => {
  Socket.off("users:online", callback);
};

export const onUserStatus = (callback) => {
  Socket.on("user:status", callback);
};

export const offUserStatus = (callback) => {
  Socket.off("user:status", callback);
};