const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require("mongoose");

const pageError = async (req, res) => {
    res.render("admin/pageError")

}

//adminloginpage laoding
const loadAdmin = async (req, res) => {
    try {

        if (req.session.admin) {
            return res.redirect("/admin/dashboard");
        } else {
            return res.render("admin/admin-login", { message: null })
        }

    } catch (error) {
        console.log(("unexpected error during loading login", error));
        res.redirect("/pageError")
    }
}
const login = async (req, res) => {
    try {


        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = true;
                // redirecting to dashboard
                return res.redirect('/admin/dashboard');
            } else {
                req.flash('error', 'Invalid password');
                return res.redirect('/admin/login');
            }
        } else {
            req.flash('error', 'Admin not found');
            return res.redirect('/admin/login');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        return res.redirect('/pageError');
    }
};
const loadDashboard = (req, res) => {
    if (req.session.admin) {
        res.render('admin/dashboard');
    } else {
        res.redirect('/admin/login');
    }
};
const logout = async (req, res) => {
    try {
        req.session.admin = false;
        // req.session.destroy();

        // ((err)=>{
        //     if(err){
        //         console.log("Error destroying session",err)
        //         return res.redirect("/pageError")
        //     }
        res.redirect("/admin/login")
    }

    catch (error) {
        console.log(("unexpected error during logout", error));
        res.redirect("/pageError")

    }
}
module.exports = {

    loadAdmin,
    login,
    loadDashboard,
    pageError,
    logout
};
