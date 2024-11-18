const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const Schema = mongoose.Schema

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
    // match: [/.+@.+\..+/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    // required: function() { return !this.googleId; }
    required: false
  },
  name: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    // required: true,
    default: false

    
  },
  isBlocked: {
    type: Boolean,
    required: true,
    default: false
  },
  phone: {
    type: String,
    required: false,
    unique: false,
    sparse: true,
    default: null
  },

  googleId: {
    type: String
    // unique: true,

  },
  cart: [{
    type: Schema.Types.ObjectId,
    ref: 'Cart'
  }],
  wallet: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet'

  },
  wishlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Wishlist'
  }],
  orderHistory: [{
    type: Schema.Types.ObjectId,
    ref: 'Order'

  }],
  referalCode: {
    type: String

  },
  redeemed: {
    type: Boolean

  },
  redeemedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'

  }],
  searchHistory: [{
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category'
    },
    brand: {
      type: String
    },
    searchOn: {
      type: Date,
      default: Date.now
    }
  }]

})

const User = mongoose.model('User', userSchema)

module.exports = User
