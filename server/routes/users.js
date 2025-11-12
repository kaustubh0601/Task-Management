const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUsersForAssignment
} = require('../controllers/userController');

/**
 * @route   GET /api/users/for-assignment
 * @desc    Get all active users for task assignment dropdown
 * @access  Private (requires authentication)
 */
router.get('/for-assignment', auth, getUsersForAssignment);

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filtering
 * @access  Private (Admin only)
 * @query   { page?, limit?, search?, role?, isActive? }
 */
router.get('/', auth, adminAuth, getAllUsers);

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (Admin only)
 * @body    { username, email, password, firstName?, lastName?, role? }
 */
router.post('/', auth, adminAuth, createUser);

/**
 * @route   GET /api/users/:id
 * @desc    Get single user by ID with task statistics
 * @access  Private (Admin only)
 */
router.get('/:id', auth, adminAuth, getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user details
 * @access  Private (Admin only)
 * @body    { username?, email?, firstName?, lastName?, role?, isActive? }
 */
router.put('/:id', auth, adminAuth, updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/:id', auth, adminAuth, deleteUser);

module.exports = router;