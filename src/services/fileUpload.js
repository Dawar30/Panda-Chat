import cloudinary from "../../config/cloudinary.js";

const isLikelyLocalPath = (value) => typeof value === "string" && /[\\/]/.test(value) && /\.[a-z0-9]+$/i.test(value);

const normalizeUploadSource = (value) => {
    if (typeof value !== "string") {
        return value;
    }

    if (value.startsWith("data:")) {
        return value;
    }

    if (isLikelyLocalPath(value)) {
        return value;
    }

    return `data:application/octet-stream;base64,${value}`;
};

export const uploadFile = async (fileSource) => {
    const uploadSource = normalizeUploadSource(fileSource);
    const isPdf = typeof uploadSource === "string" && (
        uploadSource.toLowerCase().includes("application/pdf") ||
        uploadSource.toLowerCase().endsWith(".pdf")
    );
    
    try {
        const result = await cloudinary.uploader.upload(uploadSource, {
            resource_type: isPdf ? "raw" : "auto", 
        });

        return {
            public_id: result.public_id,
            url: result.secure_url
        };
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        throw error;
    }
};



export const deleteFile = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error("Error deleting file from Cloudinary:", error);
        throw error;
    }
};