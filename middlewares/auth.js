const User = require("../models/User");


const userAuth = (req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user.id)
            .then(user => {
                if (user) {

                    if (!user.isBlocked) {
                        next();
                    } else {

                        req.session.destroy((err) => {
                            if (err) {
                                console.error("Error destroying session:", err);
                                return res.redirect("/")
                            }
                            res.redirect("/login");
                        });
                    }
                } else {

                    res.redirect("/login");
                }
            })
            .catch(error => {
                console.error("Error in user auth middleware:", error);
                res.status(500).send("Internal server error");
            });
    } else {

        const allowedPaths = ["/", "/shop"];
        if (allowedPaths.includes(req.path)) {
            next();
        } else {
            res.redirect("/login");
        }
    }
};




const adminAuth = (req, res, next) => {
    User.findOne({ isAdmin: true })
        .then(data => {
            if (data) {
                next();
            }
            else {
                res.redirect("/admin/adminLogin")
            }
        })
        .catch(error => {
            console.log("Error in adminauth middleware");
            res.status(500).send("Internal server error")

        })

};





module.exports = {
    userAuth,
    adminAuth,
}