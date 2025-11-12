const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * This function establishes connection to MongoDB using Mongoose
 */
const connectDB = async () => {
    try {
        // Connect to MongoDB
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // These options are no longer needed in newer versions of Mongoose
            // but keeping them for compatibility
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📂 Database Name: ${conn.connection.name}`);
        
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error.message);
        
        // Exit process with failure if database connection fails
        process.exit(1);
    }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('🔒 MongoDB connection closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
    }
});

module.exports = connectDB;