export const formatMessageTime = (createdAt) => {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const normalizeMessage = (message) => ({
  ...message,
  id: message._id,
  text: message.content,
  time: formatMessageTime(message.createdAt),
});

export const normalizeConversation = (conversation) => ({
  ...conversation,
  id: conversation._id,
  name: conversation.group?.name || conversation.otherParticipant?.name || conversation.otherParticipant?.username,
});
