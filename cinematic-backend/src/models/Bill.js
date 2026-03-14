const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Bill = sequelize.define(
    "Bill",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        invoiceNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        quotationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        clientName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        clientEmail: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isEmail: true },
        },
        clientPhone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        clientAddress: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        eventType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        eventDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        items: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        subtotal: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
        },
        gstRate: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 18,
        },
        taxAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
        },
        totalAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
        },
        advancePaid: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
        },
        balanceAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
        },
        dueDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM("Unpaid", "Partially Paid", "Paid", "Overdue", "Cancelled"),
            allowNull: false,
            defaultValue: "Unpaid",
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        indexes: [
            { fields: ["invoiceNumber"] },
            { fields: ["quotationId"] },
            { fields: ["status"] },
        ],
    }
);

module.exports = Bill;
