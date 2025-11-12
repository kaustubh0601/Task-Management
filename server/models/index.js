/**
 * Models index file
 * Exports all database models for easy importing
 */

const User = require('./User');
const Task = require('./Task');

module.exports = {
    User,
    Task
};