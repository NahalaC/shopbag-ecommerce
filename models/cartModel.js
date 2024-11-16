const mongoose = require('mongoose')
const Schema = mongoose.Schema

const cartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      defulat: 'placed'
    }

  }
  ]
}, { timestamps: true })
const Cart = mongoose.model('Cart', cartSchema)
module.exports = Cart
