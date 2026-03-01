const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ApiLog = sequelize.define(
    "ApiLog",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        method: {
            type: DataTypes.ENUM("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"),
            allowNull: false,
        },
        url: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        statusCode: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        requestHeaders: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        requestBody: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        requestQuery: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        responseBody: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        responseSize: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: "Response size in bytes",
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: "Request duration in milliseconds",
        },
        ipAddress: {
            type: DataTypes.STRING(64),
            allowNull: true,
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        logType: {
            type: DataTypes.ENUM("request", "response", "error", "system"),
            defaultValue: "response",
        },
        isError: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        tableName: "api_logs",
        timestamps: true,
        indexes: [
            { fields: ["method"] },
            { fields: ["statusCode"] },
            { fields: ["logType"] },
            { fields: ["isError"] },
            { fields: ["createdAt"] },
        ],
    }
);

module.exports = ApiLog;
