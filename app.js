const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('express-flash');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

require('dotenv').config();
require('./config/passport'); 
const userRoutes = require('./routes/userRoutes');
const adminRoutes=require('./routes/adminRoutes')
const User = require('./models/User'); 

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopbag')
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('Error connecting to MongoDB:', error.message));

// Set up sessions
app.use(session({
    secret: process.env.SESSION_SECRET || 'yourSuperSecretKey123!@#ABCdef',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/shopbag' }),
    cookie: {
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000, // 72 hours
        secure: false
    }
}));

// Set user data in locals for templates
app.use((req, res, next) => {
    res.locals.userData = req.session.userData || null;
    next();
});




// Initialize Passport and sessions
app.use(passport.initialize());
app.use(passport.session());

// Flash middleware
app.use(flash());

// Middleware to set flash messages in locals
app.use((req, res, next) => {
    res.locals.error_msg = req.flash('error_msg');
    res.locals.success_msg = req.flash('success_msg');
    next();
});

// Middleware to add user to locals
app.use((req, res, next) => {
    res.locals.user = req.user || null; // Ensure user is set correctly
    next();
});



// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Passport session setup
passport.serializeUser((user, done) => {
    done(null, user.id); // Store user ID in the session
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);  // If user is found, pass it to done
    } catch (err) {
        done(err);  // If there's an error, pass the error to done
    }
});

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback', // Update to your actual domain in production
    passReqToCallback: true
},
async (req, accessToken, refreshToken, profile, done) => {
    try {
        // Check if the user already exists
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
            return done(null, user); // User already exists
        }

        // If user doesn't exist, create a new user
        const newUser = new User({
            username: profile.displayName,
            googleId: profile.id,
            email: profile.emails[0].value // Assuming Google always returns an email
        });

        await newUser.save();
        return done(null, newUser);
    } catch (err) {
        return done(err, null);
    }
}));

// Routes for Google Authentication
app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email'] // Request user's profile and email
}));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/'); // Redirect after successful login
    }
);

// Route to handle logout
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return next(err);
        }
        req.session.destroy(() => {
            res.clearCookie('connect.sid'); 
            res.redirect('/'); 
        });
    });
});

// Use user routes
app.use('/', userRoutes);
app.use('/', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    req.flash('error_msg', 'Something went wrong. Please try again.');
    res.redirect('/login');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
