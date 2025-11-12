const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    updateTaskStatus,
    getTasksByPriority
} = require('../controllers/taskController');

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private (requires authentication)
 * @body    { title, description, dueDate, priority?, assignedTo?, tags? }
 */
router.post('/', auth, createTask);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks with pagination and filtering
 * @access  Private (requires authentication)
 * @query   { page?, limit?, status?, priority?, assignedTo?, search?, sortBy?, sortOrder? }
 */
router.get('/', auth, getTasks);

/**
 * @route   GET /api/tasks/priority/:priority
 * @desc    Get tasks by priority level
 * @access  Private (requires authentication)
 * @param   priority - Priority level (low, medium, high, urgent)
 */
router.get('/priority/:priority', auth, getTasksByPriority);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task by ID
 * @access  Private (requires authentication)
 */
router.get('/:id', auth, getTaskById);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task details
 * @access  Private (requires authentication - creator, assignee, or admin)
 * @body    { title?, description?, dueDate?, priority?, status?, assignedTo?, tags? }
 */
router.put('/:id', auth, updateTask);

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update task status only
 * @access  Private (requires authentication - creator, assignee, or admin)
 * @body    { status }
 */
router.patch('/:id/status', auth, updateTaskStatus);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 * @access  Private (requires authentication - creator or admin only)
 */
router.delete('/:id', auth, deleteTask);

module.exports = router;