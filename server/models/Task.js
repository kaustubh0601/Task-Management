const mongoose = require('mongoose');

/**
 * Task Schema for task management system
 * Handles tasks with priorities, status, assignments, and due dates
 */
const taskSchema = new mongoose.Schema({
    // Basic task information
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        maxlength: [100, 'Task title cannot exceed 100 characters']
    },
    
    description: {
        type: String,
        required: [true, 'Task description is required'],
        trim: true,
        maxlength: [1000, 'Task description cannot exceed 1000 characters']
    },
    
    // Task scheduling
    dueDate: {
        type: Date,
        required: [true, 'Due date is required'],
        validate: {
            validator: function(value) {
                // Due date should be in the future (or today)
                return value >= new Date().setHours(0, 0, 0, 0);
            },
            message: 'Due date cannot be in the past'
        }
    },
    
    // Task status management
    status: {
        type: String,
        enum: {
            values: ['pending', 'in-progress', 'completed', 'cancelled'],
            message: '{VALUE} is not a valid status'
        },
        default: 'pending'
    },
    
    // Priority management with color coding
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high', 'urgent'],
            message: '{VALUE} is not a valid priority'
        },
        default: 'medium'
    },
    
    // User assignment
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Task creator is required']
    },
    
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Task must be assigned to a user']
    },
    
    // Task completion tracking
    completedAt: {
        type: Date,
        default: null
    },
    
    // Additional metadata
    tags: [{
        type: String,
        trim: true,
        maxlength: [20, 'Tag cannot exceed 20 characters']
    }],
    
    // Comments or notes
    notes: [{
        text: {
            type: String,
            required: true,
            maxlength: [500, 'Note cannot exceed 500 characters']
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true, // Automatically add createdAt and updatedAt
    toJSON: { virtuals: true }, // Include virtual fields in JSON
    toObject: { virtuals: true }
});

// Indexes for better query performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ status: 1 });

/**
 * Virtual field to check if task is overdue
 */
taskSchema.virtual('isOverdue').get(function() {
    if (this.status === 'completed') return false;
    return new Date() > this.dueDate;
});

/**
 * Virtual field to get days remaining until due date
 */
taskSchema.virtual('daysUntilDue').get(function() {
    const today = new Date().setHours(0, 0, 0, 0);
    const due = new Date(this.dueDate).setHours(0, 0, 0, 0);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

/**
 * Get priority color for frontend styling
 */
taskSchema.virtual('priorityColor').get(function() {
    const colors = {
        low: '#10B981',      // Green
        medium: '#F59E0B',   // Yellow
        high: '#F97316',     // Orange
        urgent: '#EF4444'    // Red
    };
    return colors[this.priority] || '#6B7280'; // Default gray
});

/**
 * Middleware to set completedAt when status changes to completed
 */
taskSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        if (this.status === 'completed' && !this.completedAt) {
            this.completedAt = new Date();
        } else if (this.status !== 'completed') {
            this.completedAt = null;
        }
    }
    next();
});

/**
 * Static method to get tasks by priority
 * @param {string} priority - Priority level
 * @returns {Promise} - Tasks with specified priority
 */
taskSchema.statics.getTasksByPriority = function(priority) {
    return this.find({ priority })
        .populate('assignedTo', 'username firstName lastName')
        .populate('createdBy', 'username firstName lastName')
        .sort({ dueDate: 1 });
};

/**
 * Static method to get user's tasks
 * @param {string} userId - User ID
 * @param {string} status - Optional status filter
 * @returns {Promise} - User's tasks
 */
taskSchema.statics.getUserTasks = function(userId, status = null) {
    const query = { assignedTo: userId };
    if (status) query.status = status;
    
    return this.find(query)
        .populate('createdBy', 'username firstName lastName')
        .sort({ dueDate: 1 });
};

// Create and export the Task model
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;