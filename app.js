const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const session = require('express-session')
const flash = require('express-flash')
const MongoStore = require('connect-mongo')
const passport = require('./config/passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
// const multer=require('multer');
require('dotenv').config()
const userRoutes = require('./routes/userRoutes')
const adminRoutes = require('./routes/adminRoutes')
const User = require('./models/User')
const fs = require('fs')
const app = express()
const nocache = require('nocache')

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopbag')
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) =>
    console.error('Error connecting to MongoDB:', error.message)
  )

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'yourSuperSecretKey123!@#ABCdef',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/shopbag'
    }),
    cookie: {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000, // 72 hours
      secure: false
    }
  })
)
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(passport.initialize())
app.use(passport.session())

app.use(nocache())

app.use((req, res, next) => {
  res.locals.user = req.session.user || null
  // console.log("Session user data in middleware:", res.locals.user);
  next()
})

app.use(express.static(path.join(__dirname, 'public')))

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}
app.use('/admin', adminRoutes)
app.use('/', userRoutes)

app.use((req, res, next) => {
  res.locals.user = req.user || null
  next()
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  req.flash('error_msg', 'Something went wrong. Please try again.')
  res.redirect('/login')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
