const mongoose = require('mongoose')
const { Schema } = mongoose

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },

  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  regularPrice: {
    type: Number,
    required: true
  },
  salePrice: {
    type: Number,
    required: true
  },
  productOffer: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    default: 0,
    required: true

  },
  color: {
    type: String,
    required: true
  },
  productImage: {
    type: [String],
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Out of Stock', 'Available', 'Discontinued']
  },
  isBlocked: {
    type: Boolean,
    default: false
  }

}, { timestamps: true })

const Product = mongoose.model('Product', productSchema)

module.exports = Product
