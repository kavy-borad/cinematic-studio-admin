const ApiLog = require("../models/ApiLog");

// List of routes to skip logging (avoid logging the log viewer itself)
const SKIP_PATHS = ["/api/logs", "/log-viewer", "/uploads", "/favicon.ico"];

const apiLogger = (req, res, next) => {
    // Skip log-viewer and logs API routes
    const shouldSkip = SKIP_PATHS.some((p) => req.originalUrl.startsWith(p));
    if (shouldSkip) return next();

    const startTime = Date.now();

    // Intercept res.send to capture response body
    const originalSend = res.send;
    let capturedResponseBody = null;
    let capturedResponseSize = 0;

    res.send = function (body) {
        // Try to parse JSON response body
        if (body) {
            capturedResponseSize = typeof body === "string" ? Buffer.byteLength(body) : 0;
            try {
                capturedResponseBody = typeof body === "string" ? JSON.parse(body) : body;
            } catch (e) {
                capturedResponseBody = null;
            }
        }
        return originalSend.call(this, body);
    };

    // Use 'close' event (more reliable in Express 5)
    res.on("close", () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const isError = statusCode >= 400;

        // Sanitise request headers (remove sensitive fields)
        const rawHeaders = { ...req.headers };
        if (rawHeaders.authorization) {
            rawHeaders.authorization = rawHeaders.authorization.startsWith("Bearer ")
                ? "Bearer ***"
                : "***";
        }
        if (rawHeaders.cookie) rawHeaders.cookie = "***";

        // Sanitise request body (hide passwords)
        let safeBody = null;
        if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
            safeBody = { ...req.body };
            if (safeBody.password) safeBody.password = "***";
        }

        // Query params
        const queryParams = req.query && Object.keys(req.query).length > 0 ? req.query : null;

        // IP address
        const ipAddress =
            req.headers["x-forwarded-for"] ||
            req.ip ||
            req.socket?.remoteAddress ||
            null;

        // Save log to DB (fire and forget — don't await, don't block)
        ApiLog.create({
            method: req.method,
            url: req.originalUrl,
            statusCode,
            requestHeaders: rawHeaders,
            requestBody: safeBody,
            requestQuery: queryParams,
            responseBody: capturedResponseBody,
            responseSize: capturedResponseSize,
            duration,
            ipAddress,
            userAgent: req.headers["user-agent"] || null,
            logType: isError ? "error" : "response",
            isError,
        }).catch((err) => {
            console.error("[apiLogger] Failed to save log:", err.message);
        });
    });

    next();
};

module.exports = apiLogger;
