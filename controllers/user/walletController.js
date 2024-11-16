const User = require('../../models/User')
const Order = require('../../models/orderModel')
const Wallet = require('../../models/walletModel')

const getWalletPage = async (req, res) => {
  try {
    const userId = req.session.user.id
    const wallet = await Wallet.findOne({ userId })

    if (!wallet) {
      return res.render('user/wallet', { wallet: { balance: 0, transactions: [] } })
    }

    wallet.transactions.sort((a, b) => b.createdAt - a.createdAt)

    res.render('user/wallet', { wallet })
  } catch (error) {
    console.log('Error while loading wallet page', error)
    res.redirect('/pageNotfound')
  }
}

module.exports = {
  getWalletPage
}
