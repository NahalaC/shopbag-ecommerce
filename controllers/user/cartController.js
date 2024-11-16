const Cart = require('../../models/cartModel')
const Product = require('../../models/Productmodel')
const User = require('../../models/User')
const Wishlist = require('../../models/wishlistModel')

const getCart = async (req, res) => {
  try {
    const user = req.session.user

    if (!user) {
      return res.render('user/login', { message: 'Please Login first' })
    }

    const userId = user.id
    const cart = await Cart.findOne({ userId }).populate('items.productId')

    const userData = await User.findById(userId)
    if (!userData) {
      return res.render('user/login', {
        message: 'User not found, please log in again'
      })
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.render('user/cart', {
        user: userData,
        cartItems: [],
        subtotal: 0,
        shippingCharge: 0,
        total: 0
      })
    }

    let subtotal = 0

    cart.items.forEach((item) => {
      if (item.productId && item.productId.salePrice != null) {
        subtotal += item.productId.salePrice * item.quantity
      } else {
        console.log('Invalid productId or missing salePrice for item:', item)
      }
    })

    const shippingCharge = subtotal < 500 ? 50 : 0
    const total = subtotal + shippingCharge

    res.render('user/cart', {
      user: userData,
      cartItems: cart.items,
      subtotal,
      shippingCharge,
      total
    })
  } catch (error) {
    console.error(error.message, 'Error in loading Cart')
    res.status(500).send('Internal server error')
  }
}

const addToCart = async (req, res) => {
  try {
    if (req.session.user) {
      const { productId, quantity = 1 } = req.body

      const product = await Product.findById(productId)
      if (!product) {
        return res.status(400).json({ success: false, message: 'Product not found' })
      }

      const userId = req.session.user.id
      const cart = await Cart.findOne({ userId })

      if (!cart) {
        const newCart = new Cart({
          userId,
          items: [
            {
              productId,
              quantity,
              price: product.salePrice,
              totalPrice: product.salePrice * quantity
            }
          ]
        })
        await newCart.save()
      } else {
        const existingItem = cart.items.find((item) => item.productId.toString() === productId.toString())

        if (existingItem) {
          return res.status(200).json({
            success: false,
            message: 'Product is already in the cart',
            redirectToCart: true
          })
        } else {
          if (quantity > 3) {
            return res.status(400).json({
              success: false,
              message: "You can't add more than 3 units of this product at a time."
            })
          }

          cart.items.push({
            productId,
            quantity,
            price: product.salePrice,
            totalPrice: product.salePrice * quantity
          })
          await cart.save()
        }
      }

      await Wishlist.updateOne(
        { userId },
        { $pull: { products: { productId } } }
      )

      return res.status(200).json({ success: true, message: 'Product added to cart and removed from wishlist' })
    } else {
      return res.status(401).json({ success: false, message: 'Please Login First' })
    }
  } catch (error) {
    console.log('Error in add to cart:', error.message)
    return res.status(500).send('Internal server error')
  }
}

const removeProductFromCart = async (req, res) => {
  try {
    const userId = req.session.user.id
    const { productId } = req.body

    const cart = await Cart.findOne({ userId })
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: 'Cart not found.' })
    }

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    )
    await cart.save()

    return res.json({ success: true })
  } catch (error) {
    console.error('Error in removing product from cart:', error.message)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

const updateCart = async (req, res) => {
  try {
    const userId = req.session.user.id
    const { quantities } = req.body

    const cart = await Cart.findOne({ userId })
    if (!cart) {
      return res.json({ success: false })
    }

    cart.items.forEach((item) => {
      if (quantities[item.productId]) {
        item.quantity = parseInt(quantities[item.productId], 10)
        item.totalPrice = item.quantity * item.price
      }
    })

    await cart.save()

    res.json({ success: true })
  } catch (error) {
    console.log(error.message, 'Error in updating cart')
    res.status(500).json({ success: false })
  }
}

module.exports = {
  getCart,
  addToCart,
  removeProductFromCart,
  updateCart
}
