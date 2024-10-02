const User = require("../../models/User");





const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page, 10)
        }
        const limit = 3;
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                { email: { $regex: ".*" + search + ".*", $options: 'i' } }

            ],
        }).limit(limit).skip((page - 1) * limit).exec();


        const count = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                { email: { $regex: ".*" + search + ".*", $options: 'i' } }

            ],
        }).countDocuments();
        const totalPages = Math.ceil(count / limit);


        res.render('admin/users', {
            data: userData,
            totalPages: totalPages,
            currentPage: page
        });



    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");

    }


}


const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect("/admin/users")


    } catch (error) {
        res.redirect("/admin/pageError")

    }
}
const customerunBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect("/admin/users")
    } catch (error) {

        res.redirect("/admin/pageError")
    }
}
module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked
}