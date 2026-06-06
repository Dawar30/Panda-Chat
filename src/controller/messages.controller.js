import Message from "../model/messages.model.js";
import { uploadFile } from "../services/fileUpload.js";

export const sendMessage = async (req, res) => {
    try {
        let file = {};
        const { sender, receiver, message, groupId } = req.body;

        if (req.file) {
            const uploadedFile = await uploadFile(req.file.path);
            file.public_id = uploadedFile.public_id;
            file.url = uploadedFile.url;
        }

        const newMessage = await Message.create({
            sender,
            receiver: groupId ? undefined : receiver,
            message,
            file,
            group: groupId || undefined,
            isGroup: Boolean(groupId)
        });

        if (groupId) {
            req.ioEmitters.notifyGroupMessage(groupId, newMessage);
        } else {
            req.ioEmitters.notifyNewMessage(receiver, newMessage);
        }

        res.status(200).json({ success: true, message: "Message sent successfully", data: newMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        console.log(error);
    }
};

export const getMessages = async (req, res) => {
    try {

        const messages = await Message.find();

        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        console.log(error);
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        //delete from cloudinary if file exists
        const msg = await Message.findById(messageId);
        if (msg.file && msg.file.public_id) {
            await deleteFile(msg.file.public_id);
        }
        const deletedMessage = await Message.findByIdAndDelete(messageId);
        if (!deletedMessage) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }
        res.status(200).json({ success: true, message: "Message deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        console.log(error);
    }
};

export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { newContent } = req.body;
        //if file editing is needed, delete old file from cloudinary and upload new one
        if (req.file) {
            const msg = await Message.findById(messageId);
            if (msg.file && msg.file.public_id) {
                await deleteFile(msg.file.public_id);
            }
            const fileData = req.file;
            const uploadedFile = await uploadFile(fileData.path);
            newContent.file.public_id = uploadedFile.public_id;
            newContent.file.url = uploadedFile.url;
        }
        const updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            { message: newContent },
            { new: true }
        );
        if (!updatedMessage) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }
        res.status(200).json({ success: true, message: "Message updated successfully", data: updatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
        console.log(error);
    }
};