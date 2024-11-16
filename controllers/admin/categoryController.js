const category = require('../../models/Categorymodel')

const categoryInfo = async (req, res) => {
  // console.log("add categories reched")
  try {
    // console.log("categoryInfo function reached");
    const page = parseInt(req.query.page) || 1
    const limit = 4
    const skip = (page - 1) * limit
    const categoryData = await category.find({})
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit)
    // console.log("Categories retrieved:", categoryData);
    const totalCategories = await category.countDocuments()
    const totalPages = Math.ceil(totalCategories / limit)
    // console.log("Total Categories:", totalCategories);
    res.render('admin/categories', {
      cat: categoryData,
      currentPage: page,
      totalPages,
      totalCategories
    })
  } catch (error) {
    console.error(error)
    res.redirect('/admin/pageError')
  }
}
const addCategory = async (req, res) => {
  const { name, description } = req.body
  console.log('add category')
  try {
    const existingCategory = await category.findOne({ name })
    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists' })
    }
    const newCategory = new category({
      name,
      description
    })
    await newCategory.save()
    return res.status(200).json({ message: 'Category added succefully' })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const getListCategory = async (req, res) => {
  console.log('getlist')
  try {
    const id = req.query.id
    if (!id) {
      throw new Error('No category ID provided')
    }
    await category.updateOne({ _id: id }, { $set: { isListed: false } })
    res.redirect('/admin/categories')
  } catch (error) {
    console.error('Error listing category:', error)
    res.redirect('/pageError')
  }
}

const getUnlistCategory = async (req, res) => {
  console.log('getunlist')
  try {
    const id = req.query.id
    if (!id) {
      throw new Error('No category ID provided')
    }
    await category.updateOne({ _id: id }, { $set: { isListed: true } })
    res.redirect('/admin/categories')
  } catch (error) {
    console.error('Error unlisting category:', error)
    res.redirect('/pageError')
  }
}

const getEditCategory = async (req, res) => {
  try {
    const id = req.query.id
    // console.log("Received ID: ", id);

    const fetchedCategory = await category.findOne({ _id: id })

    if (!fetchedCategory) {
      console.log('Category not found')
      return res.redirect('/admin/pageError')
    }

    res.render('admin/editCategory', { category: fetchedCategory })
  } catch (error) {
    console.error('Error in getEditCategory: ', error)
    res.redirect('/admin/pageError')
  }
}

// category editing
const editCategory = async (req, res) => {
  try {
    console.log('edit cat reached  ')

    const id = req.params.id
    console.log('Updating category with ID: ', id)
    const { name, description } = req.body
    console.log('Received data: ', name, description)

    const categoryToUpdate = await category.findById(id)

    if (!categoryToUpdate) {
      console.log('Category not found')
      return res.status(404).json({ error: 'Category not found' })
    }

    if (name && name !== categoryToUpdate.name) {
      const existingCategory = await category.findOne({ name })
      if (existingCategory) {
        console.log('Category name already exists')
        return res.status(400).json({ error: 'Category exists, please choose another name' })
      }
    }

    categoryToUpdate.name = name || categoryToUpdate.name
    categoryToUpdate.description = description || categoryToUpdate.description

    await categoryToUpdate.save()
    console.log('Category updated successfully: ', categoryToUpdate)

    return res.json({ message: 'Category updated successfully!' })
  } catch (error) {
    console.error('Error in editCategory: ', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  categoryInfo,
  addCategory,
  getListCategory,
  getUnlistCategory,
  getEditCategory,
  editCategory
}
