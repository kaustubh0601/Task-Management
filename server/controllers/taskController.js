const { Task, User } = require('../models');
const mongoose = require('mongoose');

/**
 * Create a new task
 * POST /api/tasks
 */
const createTask = async (req, res) => {
    try {
        const { title, description, dueDate, priority, assignedTo, tags } = req.body;

        // Validate required fields
        if (!title || !description || !dueDate) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, and due date are required'
            });
        }

        // Validate assigned user exists
        let assignedUser = req.user._id; // Default to creator
        if (assignedTo) {
            const userExists = await User.findById(assignedTo);
            if (!userExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Assigned user not found'
                });
            }
            assignedUser = assignedTo;
        }

        // Create new task
        const task = new Task({
            title,
            description,
            dueDate: new Date(dueDate),
            priority: priority || 'medium',
            createdBy: req.user._id,
            assignedTo: assignedUser,
            tags: tags || []
        });

        await task.save();

        // Populate user details for response
        await task.populate([
            { path: 'createdBy', select: 'username firstName lastName' },
            { path: 'assignedTo', select: 'username firstName lastName' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: { task }
        });

    } catch (error) {
        console.error('Create task error:', error.message);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error creating task'
        });
    }
};

/**
 * Get all tasks with pagination and filtering
 * GET /api/tasks
 */
const getTasks = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            priority,
            assignedTo,
            search,
            sortBy = 'dueDate',
            sortOrder = 'asc'
        } = req.query;

        // Build query filters
        const query = {};
        
        // If user is not admin, only show tasks assigned to them
        if (req.user.role !== 'admin') {
            query.assignedTo = req.user._id;
        } else if (assignedTo) {
            query.assignedTo = assignedTo;
        }

        // Apply filters
        if (status) query.status = status;
        if (priority) query.priority = priority;
        
        // Search in title and description
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const tasks = await Task.find(query)
            .populate('createdBy', 'username firstName lastName')
            .populate('assignedTo', 'username firstName lastName')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await Task.countDocuments(query);
        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            data: {
                tasks,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalTasks: total,
                    hasNext: parseInt(page) < totalPages,
                    hasPrev: parseInt(page) > 1
                }
            }
        });

    } catch (error) {
        console.error('Get tasks error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching tasks'
        });
    }
};

/**
 * Get single task by ID
 * GET /api/tasks/:id
 */
const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const task = await Task.findById(id)
            .populate('createdBy', 'username firstName lastName')
            .populate('assignedTo', 'username firstName lastName')
            .populate('notes.createdBy', 'username firstName lastName');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check if user has permission to view this task
        if (req.user.role !== 'admin' && 
            !task.assignedTo._id.equals(req.user._id) && 
            !task.createdBy._id.equals(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: { task }
        });

    } catch (error) {
        console.error('Get task error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching task'
        });
    }
};

/**
 * Update task
 * PUT /api/tasks/:id
 */
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, dueDate, priority, status, assignedTo, tags } = req.body;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const task = await Task.findById(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check permissions (creator, assignee, or admin can edit)
        if (req.user.role !== 'admin' && 
            !task.assignedTo.equals(req.user._id) && 
            !task.createdBy.equals(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Validate assigned user if changing
        if (assignedTo && assignedTo !== task.assignedTo.toString()) {
            const userExists = await User.findById(assignedTo);
            if (!userExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Assigned user not found'
                });
            }
        }

        // Update task fields
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
        if (priority !== undefined) updateData.priority = priority;
        if (status !== undefined) updateData.status = status;
        if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
        if (tags !== undefined) updateData.tags = tags;

        const updatedTask = await Task.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate([
            { path: 'createdBy', select: 'username firstName lastName' },
            { path: 'assignedTo', select: 'username firstName lastName' }
        ]);

        res.json({
            success: true,
            message: 'Task updated successfully',
            data: { task: updatedTask }
        });

    } catch (error) {
        console.error('Update task error:', error.message);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error updating task'
        });
    }
};

/**
 * Delete task
 * DELETE /api/tasks/:id
 */
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const task = await Task.findById(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check permissions (creator or admin can delete)
        if (req.user.role !== 'admin' && !task.createdBy.equals(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Only task creator or admin can delete tasks'
            });
        }

        await Task.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Task deleted successfully'
        });

    } catch (error) {
        console.error('Delete task error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error deleting task'
        });
    }
};

/**
 * Update task status
 * PATCH /api/tasks/:id/status
 */
const updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        // Validate status
        const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        const task = await Task.findById(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check permissions (assignee, creator, or admin can update status)
        if (req.user.role !== 'admin' && 
            !task.assignedTo.equals(req.user._id) && 
            !task.createdBy.equals(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        task.status = status;
        await task.save();

        await task.populate([
            { path: 'createdBy', select: 'username firstName lastName' },
            { path: 'assignedTo', select: 'username firstName lastName' }
        ]);

        res.json({
            success: true,
            message: 'Task status updated successfully',
            data: { task }
        });

    } catch (error) {
        console.error('Update task status error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error updating task status'
        });
    }
};

/**
 * Get tasks by priority
 * GET /api/tasks/priority/:priority
 */
const getTasksByPriority = async (req, res) => {
    try {
        const { priority } = req.params;
        
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid priority. Must be one of: ' + validPriorities.join(', ')
            });
        }

        // Build query based on user role
        let query = { priority };
        if (req.user.role !== 'admin') {
            query.assignedTo = req.user._id;
        }

        const tasks = await Task.find(query)
            .populate('createdBy', 'username firstName lastName')
            .populate('assignedTo', 'username firstName lastName')
            .sort({ dueDate: 1 });

        res.json({
            success: true,
            data: {
                priority,
                tasks,
                count: tasks.length
            }
        });

    } catch (error) {
        console.error('Get tasks by priority error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching tasks by priority'
        });
    }
};

module.exports = {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    updateTaskStatus,
    getTasksByPriority
};