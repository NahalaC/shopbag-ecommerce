const bcrypt = require('bcrypt');
const User = require('../models/User'); // Adjust the path if needed

const authenticateUser = async (email, password) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            // If user is not found, return null
            return null;
        }
        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // If password does not match, return null
            return null;
        }
        // If both email and password are correct, return user
        return user;
    } catch (error) {
        console.error('Error in authenticateUser:', error);
        throw error; // Propagate error for further handling
    }
};

module.exports = authenticateUser;
