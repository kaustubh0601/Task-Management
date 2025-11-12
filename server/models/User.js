const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema for authentication and user management
 * This handles user registration, login, and task assignment
 */
const userSchema = new mongoose.Schema({
    // Basic user information
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include password in queries by default
    },
    
    // User role for permissions (admin can add/remove users)
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    
    // Profile information
    firstName: {
        type: String,
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    
    lastName: {
        type: String,
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    
    // Account status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true, // Automatically add createdAt and updatedAt
    toJSON: { 
        transform: function(doc, ret) {
            delete ret.password; // Remove password from JSON output
            return ret;
        }
    }
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

/**
 * Hash password before saving to database
 * This middleware runs before save() operation
 */
userSchema.pre('save', async function(next) {
    // Only hash password if it's been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        // Hash password with salt rounds of 12
        const saltRounds = 12;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

/**
 * Compare provided password with hashed password in database
 * @param {string} candidatePassword - Password to compare
 * @returns {boolean} - True if passwords match
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Get user's full name
 * @returns {string} - Full name or username if first/last name not provided
 */
userSchema.methods.getFullName = function() {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
    }
    return this.username;
};

// Create and export the User model
const User = mongoose.model('User', userSchema);

module.exports = User;