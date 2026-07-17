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

export const offMessageNew = () => {
  Socket.off("message:new");
};
