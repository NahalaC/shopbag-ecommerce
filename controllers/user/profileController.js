const User = require("../../models/User");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const Address = require('../../models/Addressmodel')
// const flash = require('express-flash');
const mongoose = require('mongoose');
function generateOtp() {
    const digits = "1234567890"
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
};

const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASS,
            }
        })
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your otp for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP: ${otp}</h4><br></b>`
        }
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return true;

    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}


const securePassword = async (password) => {
    try {

        if (!password || typeof password !== 'string') {
            console.error("Invalid password provided for hashing");
            return null;
        }


        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;

    } catch (error) {
        console.error("Error hashing password:", error);
        return null;
    }
}
const getForgotPassword = async (req, res) => {
    try {
        res.render("user/forgot-password")

    } catch (error) {
        res.redirect("/page-404")

    }
};

const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email: email });
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("user/forgotpass-otp");
                console.log("OTP:", otp)
            }
            else {
                res.json({ success: false, message: "Failed to sent OTP. Please try again" });
            }



        }
        else {
            res.render("user/forgot-password", {
                Message: "User with this email does not exist"
            });


        }


    } catch (error) {
        res.redirect("/page-404")

    }
};

const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            res.json({ success: true, redirectUrl: "/reset-password" });

        }
        else {
            res.json({ success: false, message: "OTP not matching" })
        }

    } catch (error) {
        res.status(500).json({ success: false, message: "An error occured. Please try again" });


    }
};

const getResetPasspage = async (req, res) => {
    try {
        res.render("user/reset-password")

    } catch (error) {
        res.redirect("/page-404");
    }
}

const resendOTP = async (req, res) => {
    try {
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending otp to email:", email);
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend otp:", otp);
            res.status(200).json({ success: true, message: "Resend OTP successful" })
        }

    } catch (error) {
        console.error("Error in resend otp", error);
        res.status(500).json({ success: false, message: 'Internal server error' })

    }
};


const postNewPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const email = req.session.email;


        if (!email) {
            return res.status(400).render("user/reset-password", { message: "Session expired. Please request a new OTP." });
        }

        if (newPassword === confirmPassword) {

            // console.log("Password received for hashing:", newPassword);

            const passwordHash = await securePassword(newPassword);

            if (!passwordHash) {
                return res.status(500).render("user/reset-password", { message: "Failed to secure password. Please try again." });
            }

            await User.updateOne(
                { email: email },
                { $set: { password: passwordHash } }
            );

            req.session.email = null;

            res.redirect("/login");
        } else {
            res.render("user/reset-password", { message: 'Passwords do not match' });
        }
    } catch (error) {
        console.error("Error in postNewPassword:", error);
        res.redirect("/page-404");
    }
};

const getUserprofile = async (req, res) => {
    try {
        const user = req.session.user;
        // console.log("Session User ID:", user);

        const userId = user.id;
        console.log("Session User ID:", userId);

        const userData = await User.findById(userId);

        if (!userData) {
            return res.render("login", { message: "User logged out" });
        }

        req.session.user = {
            id: userData._id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone || null,
        };

        const addressData = await Address.findOne({ userId: userId });

        res.render("user/profile", {
            user: userData, addresses: addressData ? addressData.address : [], wallet: user.wallet,
            referralCode: user.referalCode
        });
    } catch (error) {
        console.log(error.message, "Error in load user profile");
        res.status(500).send("Internal server error");
    }
};

const getEditProfile = async (req, res) => {
    try {
        const user = req.session.user;
        const userId = user.id;
        const userData = await User.findById(userId);
        if (!userData) {
            return res.redirect('/login');
        }
        req.session.user = {
            id: userData._id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone || null,
        };

        console.log("userdata", userData);
        res.render("user/editProfile", { user: userData })

    } catch (error) {
        console.log(error.message, "Error in loading edit profile");
        res.status(500).send("Internal server error");

    }
};
const editProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const user = req.session.user;
        // console.log("Session User Data:", user); 
        const userData = await User.findById(user.id);
        if (userData) {
            userData.name = name;
            userData.phone = phone;
            await userData.save();
            req.session.user = {
                id: userData._id,
                name: userData.name,
                email: userData.email,
                phone: userData.phone || null,

            }
            res.redirect("/profile")
        }
        else {
            res.status(404).send("User not found");
        }
    }

    catch (error) {
        console.log(error.messag, "Error in edit profile");
        res.status(500).send('Internal server error')

    }
};

const getChangePassword = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findById(user.id);
        res.render("user/changePassword", { user: userData });


    } catch (error) {
        console.log(error.message, "Error in loading change password");
        res.status(500).send('Internal server error')

    }
};

const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = req.session.user;
        const userData = await User.findById(user.id);

        if (!userData) {
            return res.render("login", { message: "User logged out" });
        }
        if (!oldPassword || !userData.password) {
            return res.render("user/changePassword", {
                user: userData,
                message: 'Error missing old password or user data',
                showAlert: true
            });
        }
        if (oldPassword === newPassword) {
            return res.render("user/changePassword", {
                user: userData,
                message: "New password cannot be the same as the old password",
                showAlert: true
            });
        }

        const passwordMatch = await bcrypt.compare(oldPassword, userData.password);
        if (passwordMatch) {
            const passwordHash = await securePassword(newPassword);
            userData.password = passwordHash;
            const saved = await userData.save();
            console.log("saved :  ", saved)
            // req.session.destroy((err) => {
            //     if (err) {
            //         console.log("Error logging out after password change:", err);
            //         return res.status(500).send("Internal server error");
            //     }
            //     // Render the login page with a success message
            //     res.render("login");
            // });;
            if (saved) {
                req.session.destroy()
                res.redirect("/")
            }
        } else {
            return res.render("user/changePassword", {
                user: userData,
                message: "Incorrect old password",
                showAlert: true
            });
        }
    } catch (error) {
        console.log(error.message, "Error in change password");
        return res.status(500).send("Internal server error");
    }
};

const getAddAddres = async (req, res) => {
    try {
        const user = req.session.user;
        const userId = req.session.user.id;
        const returnTo = req.query.returnTo || 'profile';


        const userData = await User.findById(user.id);
        const addressData = await Address.findOne({ userId: userId });
        res.render("user/addAddress", { user: userData, addresses: addressData ? addressData.address : [], returnTo });
    }
    catch (error) {
        console.log(error.message, "Error in load add address");
        res.status(500).send("Internal Server Error");
    }
};



const addAddress = async (req, res) => {
    try {
        const { addressType, name, city, state, pincode, phone, email, returnTo } = req.body;
        const user = req.session.user;


        const userData = await User.findById(user.id);

        if (userData) {
            const newAddress = {
                addressType,
                name,
                city,
                state,
                pincode,
                phone,
                email
            };

            const addressDoc = await Address.findOne({ userId: user.id });
            if (addressDoc) {
                addressDoc.address.push(newAddress);
                await addressDoc.save();
            } else {
                const newAddressDoc = new Address({
                    userId: user.id,
                    address: [newAddress]
                });
                await newAddressDoc.save();
            }



            if (returnTo === 'checkout') {
                res.redirect("/checkout");
            } else {
                res.redirect("/profile");
            }
        } else {
            res.render("user/login", { message: "User logged out" });
        }
    } catch (error) {
        console.log(error.message, "Error in add address");
        res.status(500).send("Internal server error");
    }
};

const getEditAddress = async (req, res) => {
    try {
        const addressId = req.query.id;
        const returnTo = req.query.returnTo;
        const user = req.session.user;

        if (!user) {
            return res.render("user/login", { message: "User logged out" });
        }
        const userId = user.id;
        const userAddress = await Address.findOne({ userId: userId });


        if (!userAddress) {
            return res.status(404).send('User not found');
        }
        const address = userAddress.address.find(addr => addr._id.toString() === addressId);
        if (!address) {
            return res.status(404).send('Address not found');
        }

        res.render('user/editAddress', { address, returnTo });


    } catch (error) {
        console.log(error.message, "Error in load edit address");
        res.status(500).send("Internal server error");

    }


};





const editAddress = async (req, res) => {
    try {
        const addressId = req.query.id || req.body.id;
        const returnTo = req.body.returnTo;
        // const addressId = req.query.id;
        const user = req.session.user;

        console.log("Request Body:", req.body);
        console.log("Address ID:", addressId);

        const { addressType, customAddressType, name, city, state, pincode, phone, email } = req.body;


        if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).render('user/editAddress', {
                errorMessage: "Invalid address ID"
            });
        }

        console.log("Form data:", { addressType, customAddressType, name, city, state, pincode, phone, email });
        console.log("Address ID:", addressId);


        const updatedAddressType = addressType === 'Other' ? customAddressType : addressType;

        console.log("Updated Address Type:", updatedAddressType);

        const updateData = {
            'address.$.addressType': updatedAddressType,
            'address.$.name': name,
            'address.$.city': city,
            'address.$.state': state,
            'address.$.pincode': pincode,
            'address.$.phone': phone,
            'address.$.email': email,
        };

        const updatedAddress = await Address.findOneAndUpdate(
            { 'address._id': addressId },
            { $set: updateData },
            { new: true }
        );

        console.log("Updated Address:", updatedAddress);

        if (!updatedAddress) {
            console.log(`No address found with ID: ${addressId}`);
            return res.status(404).render('user/editAddress', {
                address: req.body,
                errorMessage: "Address not found"
            });
        }

        if (returnTo === 'checkout') {
            return res.redirect('/checkout');
        } else {
            return res.redirect('/profile');
        }

    } catch (error) {
        console.log(error.message, "Error in updating address");
        res.status(500).render('user/editAddress', {
            address: req.body,
            errorMessage: "Internal server error"
        });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        console.log("aid", addressId)
        const userId = req.session.user.id;

        const addressDoc = await Address.findOneAndUpdate(
            { userId: userId },
            { $pull: { address: { _id: addressId } } },
            { new: true }
        );

        console.log("add2", addressDoc)


        if (addressDoc) {
            res.json({ success: true });
        }
        else {
            res.status(404).json({ success: false, message: 'Address not found' });
        }
        //   res.redirect('/profile');
    } catch (error) {
        console.error(error.message, "Error in delete address");
        res.status(500).json({ success: false, message: 'Error deleting address' });

    }
};



module.exports = {
    getForgotPassword,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPasspage,
    resendOTP,
    postNewPassword,
    getUserprofile,
    getEditProfile,
    editProfile,
    getChangePassword,
    changePassword,
    getAddAddres,
    addAddress,
    getEditAddress,
    editAddress,
    deleteAddress
}