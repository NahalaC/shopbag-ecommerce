const Wishlist = require('../../models/wishlistModel')
const User = require('../../models/User')
const Product = require('../../models/Productmodel')

const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user.id

    if (!userId) {
      return res.render('user/wishlist', { products: [], currentPage: 1, totalPages: 1 })
    }

    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: 'products.productId',
      populate: { path: 'category' }
    })

    if (!wishlist) {
      return res.render('user/wishlist', { products: [], currentPage: 1, totalPages: 1 })
    }

    const products = wishlist.products.map(item => item.productId)

    console.log('Wishlist products:', JSON.stringify(products, null, 2))

    const page = parseInt(req.query.page) || 1
    const pageSize = 4
    const totalProducts = products.length
    const totalPages = Math.ceil(totalProducts / pageSize)
    const paginatedProducts = products.slice((page - 1) * pageSize, page * pageSize)

    res.render('user/wishlist', {
      products: paginatedProducts,
      currentPage: page,
      totalPages
    })
  } catch (error) {
    console.error('Error while loading wishlist:', error)
    res.redirect('/pageNotfound')
  }
}

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body
    const userId = req.session.user.id
    await Wishlist.updateOne(
      { userId },
      { $pull: { products: { productId } } }
    )
    res.status(200).json({ success: true, message: 'Product removed from wishlist.' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove product from wishlist.' })
  }
}
const toggleWishlist = async (req, res) => {
  try {
    const userId = req.session.user.id
    const { productId } = req.body

    let wishlist = await Wishlist.findOne({ userId })

    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [{ productId }] })
      await wishlist.save()
      return res.status(200).json({ inWishlist: true, message: 'Product added to wishlist' })
    }

    const productIndex = wishlist.products.findIndex(item => item.productId.toString() === productId)

    if (productIndex >= 0) {
      wishlist.products.splice(productIndex, 1)
      await wishlist.save()
      return res.status(200).json({ inWishlist: false, message: 'Product removed from wishlist' })
    } else {
      wishlist.products.push({ productId })
      await wishlist.save()
      return res.status(200).json({ inWishlist: true, message: 'Product added to wishlist' })
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error)
    return res.status(500).json({ message: 'Failed to update wishlist.' })
  }
}

module.exports = {
  getWishlist,
  toggleWishlist,
  removeFromWishlist
}
