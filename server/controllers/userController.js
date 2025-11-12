const { User, Task } = require('../models');
const mongoose = require('mongoose');

/**
 * Get all users (Admin only)
 * GET /api/users
 */
const getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            role,
            isActive
        } = req.query;

        // Build query filters
        const query = {};
        
        // Apply filters
        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        
        // Search in username, email, firstName, lastName
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query with pagination
        const users = await User.find(query)
            .select('-password') // Exclude password
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await User.countDocuments(query);
        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalUsers: total,
                    hasNext: parseInt(page) < totalPages,
                    hasPrev: parseInt(page) > 1
                }
            }
        });

    } catch (error) {
        console.error('Get all users error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching users'
        });
    }
};

/**
 * Get single user by ID (Admin only)
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const user = await User.findById(id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's task statistics
        const taskStats = await Task.aggregate([
            { $match: { assignedTo: mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = {
            total: 0,
            pending: 0,
            'in-progress': 0,
            completed: 0,
            cancelled: 0
        };

        taskStats.forEach(stat => {
            stats[stat._id] = stat.count;
            stats.total += stat.count;
        });

        res.json({
            success: true,
            data: {
                user,
                taskStats: stats
            }
        });

    } catch (error) {
        console.error('Get user error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user'
        });
    }
};

/**
 * Create new user (Admin only)
 * POST /api/users
 */
const createUser = async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, role } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            firstName,
            lastName,
            role: role || 'user'
        });

        await user.save();

        // Return user data (password excluded automatically)
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    isActive: user.isActive,
                    fullName: user.getFullName()
                }
            }
        });

    } catch (error) {
        console.error('Create user error:', error.message);
        
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
            message: 'Server error creating user'
        });
    }
};

/**
 * Update user (Admin only)
 * PUT /api/users/:id
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, firstName, lastName, role, isActive } = req.body;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent admin from deactivating themselves
        if (user._id.equals(req.user._id) && isActive === false) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        // Check if username or email is being changed and if it's already taken
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ 
                username, 
                _id: { $ne: id } 
            });
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username is already taken'
                });
            }
        }

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ 
                email, 
                _id: { $ne: id } 
            });
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already taken'
                });
            }
        }

        // Update user fields
        const updateData = {};
        if (username !== undefined) updateData.username = username;
        if (email !== undefined) updateData.email = email;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'User updated successfully',
            data: { user: updatedUser }
        });

    } catch (error) {
        console.error('Update user error:', error.message);
        
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
            message: 'Server error updating user'
        });
    }
};

/**
 * Delete user (Admin only)
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent admin from deleting themselves
        if (user._id.equals(req.user._id)) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // Check if user has tasks assigned
        const userTasks = await Task.countDocuments({
            $or: [
                { assignedTo: id },
                { createdBy: id }
            ]
        });

        if (userTasks > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete user. They have ${userTasks} task(s) associated with them. Please reassign or delete those tasks first.`
            });
        }

        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error deleting user'
        });
    }
};

/**
 * Get users for assignment dropdown (All authenticated users)
 * GET /api/users/for-assignment
 */
const getUsersForAssignment = async (req, res) => {
    try {
        const users = await User.find({ isActive: true })
            .select('username firstName lastName email')
            .sort({ username: 1 });

        const userList = users.map(user => ({
            id: user._id,
            username: user.username,
            fullName: user.getFullName(),
            email: user.email
        }));

        res.json({
            success: true,
            data: { users: userList }
        });

    } catch (error) {
        console.error('Get users for assignment error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching users'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUsersForAssignment
};