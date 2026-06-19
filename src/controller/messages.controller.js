import Message from "../model/messages.model.js";
import { uploadFile } from "../services/fileUpload.js";
import { deleteFile } from "../services/fileUpload.js";
import * as cacheService from "../services/cacheService.js";

export const sendMessage = async (req, res) => {
    try {
        let file = {};
        const { senderId, conversationId, content, type = "text", receiverId } = req.body;

        if (req.file) {
            const uploadedFile = await uploadFile(req.file.path);
            file.public_id = uploadedFile.public_id;
            file.url = uploadedFile.url;
            file.size = req.file.size;
            file.mimeType = req.file.mimetype;
        }

        const newMessage = await Message.create({
            conversationId,
            senderId,
            type,
            content,
            file: Object.keys(file).length > 0 ? file : undefined
        });

        // Invalidate relevant caches
        await Promise.all([
            cacheService.del(cacheService.KEYS.MESSAGES_ALL),
            conversationId
                ? cacheService.del(cacheService.KEYS.MESSAGES_CONVERSATION(conversationId))
                : Promise.resolve(),
        ]);

        if (receiverId) {
            req.ioEmitters.notifyNewMessage(receiverId, newMessage);
        }

        res.status(200).json({ success: true, message: "Message sent successfully", data: newMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        console.log(error);
    }
};

export const getMessages = async (req, res) => {
    try {
        const { data: messages, source } = await cacheService.getOrSet(
            cacheService.KEYS.MESSAGES_ALL,
            cacheService.TTL.SHORT, // 60s
            async () => Message.find()
        );

        res.status(200).json({ success: true, data: messages, source });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        console.log(error);
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        //delete from cloudinary if file exists
        const msg = await Message.findById(messageId);
        if (msg.file && msg.file.public_id) {
            await deleteFile(msg.file.public_id);
        }
        const deletedMessage = await Message.findByIdAndDelete(messageId);
        if (!deletedMessage) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        // Invalidate relevant caches
        await Promise.all([
            cacheService.del(cacheService.KEYS.MESSAGES_ALL),
            msg?.conversationId
                ? cacheService.del(cacheService.KEYS.MESSAGES_CONVERSATION(msg.conversationId.toString()))
                : Promise.resolve(),
        ]);

        res.status(200).json({ success: true, message: "Message deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        console.log(error);
    }
};

export const editMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { content } = req.body;
        //if file editing is needed, delete old file from cloudinary and upload new one
        let file = {};
        if (req.file) {
            const msg = await Message.findById(messageId);
            if (msg.file && msg.file.public_id) {
                await deleteFile(msg.file.public_id);
            }
            const fileData = req.file;
            const uploadedFile = await uploadFile(fileData.path);
            file.public_id = uploadedFile.public_id;
            file.url = uploadedFile.url;
            file.size = req.file.size;
            file.mimeType = req.file.mimetype;
        }
        const updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            { content, edited: true, ...(Object.keys(file).length > 0 && { file }) },
            { new: true }
        );
        if (!updatedMessage) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        // Invalidate relevant caches
        await Promise.all([
            cacheService.del(cacheService.KEYS.MESSAGES_ALL),
            updatedMessage?.conversationId
                ? cacheService.del(cacheService.KEYS.MESSAGES_CONVERSATION(updatedMessage.conversationId.toString()))
                : Promise.resolve(),
        ]);

        res.status(200).json({ success: true, message: "Message updated successfully", data: updatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
        console.log(error);
    }
};