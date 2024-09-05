const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const flash = require('express-flash');

const renderAdminLogin = (req, res) => {
    let passwordError = req.flash('error')[0] || null;
    res.render('admin/adminLogin', { passwordError });
};

const adminLogin = async (req, res) => {
    console.log('recieved post request adminlogin');
    
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            req.flash("error", "Invalid email or password");
            return res.redirect("/adminLogin");
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            req.flash("error", "Invalid email or password");
            return res.redirect("/adminLogin");
        }

        if (user.status) {
            req.flash("error", "User is blocked!");
            return res.redirect("/adminLogin");
        }

        if (user.isAdmin) {
            req.session.isAdminAuthenticated = true;
            req.session.adminData = {
                id: user._id,
                username: user.username,
                email: user.email
            };

            return res.redirect("/dashboard");
        } else {
            req.flash("error", "Not authorized as admin");
            return res.redirect("/login");
        }
    } catch (error) {
        console.error("Admin login error:", error);
        req.flash("error", "Failed to log in");
        res.redirect("/adminLogin");
    }
};

module.exports = {
    adminLogin,
    renderAdminLogin
};
