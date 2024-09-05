const adminauthentication = async (req, res, next) => {
    try {
        // Check if the session indicates an authenticated admin
        if (req.session.isAdminAuthenticated) {
            // Admin is authenticated, proceed to the next middleware
            return next();
        } else {
            return res.redirect('/adminLogin');
        }
    } catch (error) {
        console.error('Error during admin authentication:', error);
        return res.render('admin/servererror');
    }
};

module.exports = { adminauthentication };
