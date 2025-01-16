const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Submission = sequelize.define('Submission', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  problemCode: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false },
  language: { type: DataTypes.STRING, allowNull: false },
  submissionFile: { type: DataTypes.STRING, allowNull: false },
  results: { type: DataTypes.JSON, allowNull: false },  // Stores test case-wise results
}, { timestamps: true });

module.exports = Submission;
