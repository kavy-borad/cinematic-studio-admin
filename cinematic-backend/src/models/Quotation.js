const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Quotation = sequelize.define("Quotation", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true },
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    eventType: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    eventDate: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    venue: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    guestCount: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    servicesRequested: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    functions: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "Event functions like Engagement, Pithi / Haldi, Reception",
    },
    budget: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    requirements: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM("New", "Contacted", "Booked", "Closed"),
        defaultValue: "New",
    },
});

module.exports = Quotation;
