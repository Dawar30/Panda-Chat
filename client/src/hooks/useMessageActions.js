import { useState, useCallback } from "react";
import { emitEditMessage, emitDeleteMessage } from "@/components/socket/socketEmitters";
import { onMessageUpdated, onMessageDeleted, offMessageUpdated, offMessageDeleted } from "@/components/socket/socketListeners";

export function useMessageActions(currentUserId, messages, setMessages) {
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const handleEditStart = useCallback((message) => {
    if (message.senderId === currentUserId) {
      setEditingMessageId(message._id);
      setActiveDropdown(null);
    }
  }, [currentUserId]);

  const handleEditCancel = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const handleEditSubmit = useCallback((messageId, newText) => {
    if (!newText.trim()) {
      return false;
    }

    emitEditMessage(messageId, newText.trim(), (response) => {
      if (response?.success) {
        setEditingMessageId(null);
      }
    });

    return true;
  }, []);

  const handleDeleteClick = useCallback((message) => {
    setMessageToDelete(message);
    setShowDeleteModal(true);
    setActiveDropdown(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (messageToDelete) {
      emitDeleteMessage(messageToDelete._id, (response) => {
        if (response?.success) {
          setMessages((prev) => prev.filter((msg) => msg._id !== messageToDelete._id));
        }
      });
      setShowDeleteModal(false);
      setMessageToDelete(null);
    }
  }, [messageToDelete, setMessages]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteModal(false);
    setMessageToDelete(null);
  }, []);

  const handleDropdownToggle = useCallback((messageId) => {
    setActiveDropdown((prev) => (prev === messageId ? null : messageId));
  }, []);

  // Listen for message updates from other users
  const setupMessageListeners = useCallback(() => {
    const handleMessageUpdated = (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMessage._id ? { ...msg, ...updatedMessage } : msg))
      );
    };

    const handleMessageDeleted = (data) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
    };

    onMessageUpdated(handleMessageUpdated);
    onMessageDeleted(handleMessageDeleted);

    return () => {
      offMessageUpdated(handleMessageUpdated);
      offMessageDeleted(handleMessageDeleted);
    };
  }, [setMessages]);

  return {
    editingMessageId,
    showDeleteModal,
    messageToDelete,
    activeDropdown,
    handleEditStart,
    handleEditCancel,
    handleEditSubmit,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleDropdownToggle,
    setupMessageListeners,
  };
}
