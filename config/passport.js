const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); // Adjust path if necessary
const bcrypt = require('bcryptjs'); // Ensure bcrypt is installed

// Configure Local Strategy
passport.use(new LocalStrategy({
    usernameField: 'email', // or 'username' if you use a username
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        // Find user by email
        const user = await User.findOne({ email: email });

        // If user not found
        if (!user) {
            return done(null, false, { message: 'No user found with this email' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            return done(null, user);
        } else {
            return done(null, false, { message: 'Incorrect password' });
        }
    } catch (error) {
        return done(error);
    }
}));

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
            return done(null, user);
        }

        user = new User({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
        });
        await user.save();
        done(null, user);
    } catch (error) {
        done(error, null);
    }
}));

// Serialize User
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize User
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});
