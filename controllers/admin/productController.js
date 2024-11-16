const Product = require('../../models/Productmodel')
const category = require('../../models/Categorymodel')
const User = require('../../models/User')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const mongoose = require('mongoose')

const getProductAddPage = async (req, res) => {
  console.log('getaddrpoduct reached')
  try {
    const categories = await category.find({ isListed: true })
    console.log('Categories found: ', categories.map(cat => ({ id: cat._id, name: cat.name })))
    res.render('admin/addProduct', {
      cat: categories
    })
  } catch (error) {
    console.error('Error in getProductAddPage:', error)
    res.redirect('/admin/pageError')
  }
}

const addProducts = async (req, res) => {
  console.log('addProduct reached')
  console.log('Product Details Submitted:', req.body, req.files)

  try {
    const products = req.body

    const productExists = await Product.findOne({ productName: products.productName })
    if (productExists) {
      return res.status(400).json({ message: 'Product already exists, please try with another one' })
    }

    const categoryId = products.category
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID format' })
    }

    const validCategory = await category.findById(categoryId)
    if (!validCategory) {
      console.log('Category not found:', categoryId)
      return res.status(400).json({ message: 'Invalid category ID' })
    }

    const images = []
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const originalImagePath = req.files[i].path
        const resizedImagePath = path.join(req.files[i].filename)

        const dir = path.dirname(resizedImagePath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }

        await sharp(originalImagePath)
          .resize({ width: 440, height: 440 })
          .toFile(resizedImagePath)
        images.push(resizedImagePath)
      }
    }

    const newProduct = new Product({
      productName: products.productName,
      description: products.descriptionData,
      category: validCategory._id,
      regularPrice: products.regularPrice,
      salePrice: products.salePrice,
      quantity: products.quantity,
      productImage: images,
      color: products.color,
      status: products.status,
      isBlocked: false
    })

    await newProduct.save()
    return res.redirect('/admin/products')
  } catch (error) {
    console.error('Error saving product', error)
    return res.redirect('/admin/pageError')
  }
}

// to show poroducts page
// const getAllproducts = async (req, res) => {
//     try {
//         const search = req.query.search || "";
//         const page = parseInt(req.query.page) || 1;
//         const limit = 5;

//         const productData = await Product.find({
//             $and: [
//                 { status: { $ne: 'Discontinued' } },
//                 { productName: { $regex: new RegExp(".*" + search + ".*", "i") } }
//             ]
//         })
//             .populate({
//                 path: 'category',
//                 match: { isListed: true },
//             })
//             .limit(limit)
//             .skip((page - 1) * limit)
//             .exec();

//         const filteredProducts = productData.filter(product => product.category);

//         const count = filteredProducts.length;

//         const categories = await category.find({ isListed: true });

//         if (categories) {
//             res.render("admin/products", {
//                 data: filteredProducts,
//                 currentPage: page,
//                 totalPages: Math.ceil(count / limit),
//                 cat: categories,
//             });
//         } else {
//             res.render("user/page-404");
//         }

//     } catch (error) {
//         console.error(error.message, "Error in getAllproducts");
//         res.redirect("/pageError");
//     }
// };
const getAllproducts = async (req, res) => {
  try {
    const search = req.query.search || ''
    const page = parseInt(req.query.page) || 1
    const limit = 5

    // Get the count of products that match the search criteria without limit/skip
    const totalProducts = await Product.countDocuments({
      status: { $ne: 'Discontinued' },
      productName: { $regex: new RegExp('.*' + search + '.*', 'i') }
    }).populate({
      path: 'category',
      match: { isListed: true }
    })

    const productData = await Product.find({
      status: { $ne: 'Discontinued' },
      productName: { $regex: new RegExp('.*' + search + '.*', 'i') }
    })
      .populate({
        path: 'category',
        match: { isListed: true }
      })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec()

    const filteredProducts = productData.filter(product => product.category)

    const categories = await category.find({ isListed: true })

    if (categories) {
      res.render('admin/products', {
        data: filteredProducts,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        cat: categories
      })
    } else {
      res.render('user/page-404')
    }
  } catch (error) {
    console.error(error.message, 'Error in getAllproducts')
    res.redirect('/pageError')
  }
}

const listProduct = async (req, res) => {
  try {
    const id = req.query.id
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } })
    res.redirect('/admin/products')
  } catch (error) {
    res.redirect('/pageError')
  }
}

const unlistProduct = async (req, res) => {
  try {
    const id = req.query.id
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } })
    res.redirect('/admin/products')
  } catch (error) {
    res.redirect('/pageError')
  }
}

const getEditProduct = async (req, res) => {
  console.log('Reached editProduct handler')

  try {
    const id = req.query.id

    if (!id) {
      return res.redirect('/pageError')
    }

    const products = await Product.findOne({ _id: id })
    const categories = await category.find({})

    if (!products) {
      return res.redirect('/pageError')
    }
    console.log('Product fetched for editing:', products)

    res.render('admin/edit-product', {
      product: products,
      categories
    })
  } catch (error) {
    console.error('Error fetching product for editing:', error)
    res.redirect('/pageError')
  }
}

const editProduct = async (req, res) => {
  console.log('Reached editProduct')
  try {
    const id = req.body.id
    const products = await Product.findOne({ _id: id })
    const data = req.body

    console.log('id', id)
    console.log('data', data)
    console.log('products', products)

    const existingProduct = await Product.findOne({
      _id: { $ne: id },
      productName: data.productName
    })
    data.category = await category.findOne({ name: data.category })

    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this name already exists. Please try with another name' })
    }

    const images = []
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename)
      }
    }
    // console.log("req.files",req.files)

    const updateFields = {
      productName: data.productName,
      description: data.description,
      category: data.category,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
      color: data.color
    }

    if (images.length > 0) {
      updateFields.$push = { productImage: { $each: images } }
    }

    await Product.findByIdAndUpdate(id, updateFields, { new: true })

    res.redirect('/admin/products')
  } catch (error) {
    console.error('Error updating product:', error)
    res.redirect('/pageError')
  }
}

const deleteSingleImage = async (req, res) => {
  console.log('Reached image delete')
  try {
    const { imageNameToServer, productIdToServer } = req.body

    await Product.findByIdAndUpdate(productIdToServer, { $pull: { productImage: imageNameToServer } })

    const imagePath = path.join('public', 'uploads', 'product-images', imageNameToServer)

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath)
      console.log(`Image ${imageNameToServer} deleted successfully`)
      return res.status(200).json({ status: true, message: 'Image deleted successfully' })
    } else {
      console.log(`Image ${imageNameToServer} not found`)
      return res.status(404).json({ status: false, message: 'Image not found' })
    }
  } catch (error) {
    console.error('Error deleting image:', error)
    res.status(500).json({ status: false, message: 'Server error' })
  }
}

module.exports = {
  getProductAddPage,
  addProducts,
  getAllproducts,
  listProduct,
  unlistProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage

}
