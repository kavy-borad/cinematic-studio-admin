const errorHandler = (err, req, res, next) => {
    console.error("❌ Error:", err.message);
    console.error(err.stack);

    // Sequelize validation errors
    if (err.name === "SequelizeValidationError") {
        const messages = err.errors.map((e) => e.message);
        return res.status(400).json({ success: false, message: messages.join(", ") });
    }

    // Sequelize unique constraint errors
    if (err.name === "SequelizeUniqueConstraintError") {
        const fields = err.errors.map((e) => e.path).join(", ");
        return res.status(409).json({ success: false, message: `Duplicate value for: ${fields}` });
    }

    // Multer file size error
    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File too large. Maximum 10MB allowed." });
    }

    // Multer unexpected field name (field not in allowed list)
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ success: false, message: `Unexpected file field: ${err.field}. Use 'coverImage' or 'images'.` });
    }

    // Multer file count exceeded
    if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({ success: false, message: "Too many files uploaded." });
    }

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};

module.exports = errorHandler;
