const bcrypt = require('bcrypt');

const password = 'Admin@123';
const hashedPassword = "$2b$10$HO31..J9D/MaWCztCLE1Fu1h3dAkvJSNtLj6CkjDw7pc2hi7iTiCO";

bcrypt.compare(password, hashedPassword, (err, result) => {
    if (err) {
        console.error('Error comparing passwords:', err);
    } else {
        console.log('Password match:', result); // Should be true if the password matches
    }
});
