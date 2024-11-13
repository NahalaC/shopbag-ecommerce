const Category = require("../../models/Categorymodel");
const Product = require("../../models/Productmodel");
const { ProductOffer, CategoryOffer } = require("../../models/offerModel");


const getProductOffers = async (req, res) => {
    try {
        let search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const productOffers = await ProductOffer.find({ offerName: { $regex: ".*" + search + ".*", $options: "i" } }).sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const totalProductOffers = await ProductOffer.countDocuments({ offerName: { $regex: ".*" + search + ".*", $options: "i" } })
        const totalPages = Math.ceil(totalProductOffers / limit);

        res.render('admin/productOffers',
            {
                productOffers,
                currentPage: page,
                totalPages,
                totalProductOffers,
                limit
            });
    } catch (error) {
        console.error('Error loading product offers:', error);
        res.redirect("/admin/pageError")
    }
};
const loadAddProductOfferPage = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ productName: 1 });
        res.render('admin/addProductOffer', { products });
    } catch (error) {
        console.error('Error loading add Product offer page:', error);
        res.redirect("/admin/pageError")
    }
};



const addProductOffer = async (req, res) => {
    const { offerName, productId, productOffer } = req.body;

    try {

        // console.log(' offerrrrr', productOffer); 


        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }


        // console.log('offer before update', product);


        const newOffer = new ProductOffer({
            offerName,
            productId,
            productName: product.productName,
            ProductOffer: productOffer
        });


        await newOffer.save();


        // console.log('offer saved', newOffer);


        product.productOffer = productOffer;
        product.salePrice = product.regularPrice * (1 - productOffer / 100);


        // console.log(' offer updatedd', product);

        await product.save();


        res.redirect('/admin/productOffers');
    } catch (error) {
        console.error('Error adding product offer:', error);
        res.redirect("/admin/pageError");
    }
};


const toggleProductOffer = async (req, res) => {
    const offerId = req.params.id;
    try {
        const offer = await ProductOffer.findById(offerId);
        if (!offer) {
            return res.status(404).send('Offer not found');
        }
        const productId = offer.productId
        const product = await Product.findById(productId);
        if (offer.isActive) {
            product.productOffer = 0
            await product.save()
        } else {
            product.productOffer = offer.productOffer
            await product.save()
            //acrivate -> deactivate ( other offers need to deactivate based on productId in productOFfers )
            const otherOffers = await ProductOffer.find({ productId, _id: { $ne: offer._id } });

            for (let offer of otherOffers) {
                offer.isActive = false;
                await offer.save()
            }
        }
        offer.isActive = !offer.isActive;
        await offer.save();
        res.redirect('/admin/productOffers');
    } catch (error) {
        console.error('Error toggling offer status:', error);
        res.redirect("/admin/pageError")
    }
};
const deleteProductOffer = async (req, res) => {
    const offerId = req.params.id;
    try {
        const offer = await ProductOffer.findByIdAndDelete(offerId);
        const productId = offer.productId
        const product = await Product.findById(productId);
        product.productOffer = 0
        await product.save()
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        return res.status(200).json({ message: "Product Offer deleted successfully" });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.redirect("/admin/pageError")
    }
};

const getCategoryOffers = async (req, res) => {
    try {
        let search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;
        const categoryOffer = await CategoryOffer.find({ offerName: { $regex: ".*" + search + ".*", $options: "i" } }).sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const totalCategoryOffer = await CategoryOffer.countDocuments({ offerName: { $regex: ".*" + search + ".*", $options: "i" } })
        const totalPages = Math.ceil(totalCategoryOffer / limit);
        res.render('admin/categoryOffers',
            {
                categoryOffer,
                currentPage: page,
                totalPages,
                totalCategoryOffer,
                limit
            });
    } catch (error) {
        console.error('Error loading categories offers:', error);
        res.redirect("/admin/pageError")
    }
};
const loadAddCategoryOfferPage = async (req, res) => {
    try {
        const category = await Category.find({}).sort({ name: 1 })
        res.render('admin/addCategoryOffer', { category });
    } catch (error) {
        console.error('Error loading add category offer page:', error);
        res.redirect("/admin/pageError")
    }
};


const addCategoryOffer = async (req, res) => {
    const { offerName, categoryId, categoryOffer } = req.body;

    try {

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).send('Category not found');
        }


        const newOffer = new CategoryOffer({
            offerName,
            categoryId,
            categoryName: category.name,
            categoryOffer
        });
        await newOffer.save();


        category.categoryOffer = categoryOffer;
        await category.save();


        const productsInThisCategory = await Product.find({ category: categoryId });
        for (let product of productsInThisCategory) {
            product.productOffer = 0;
            product.categoryOffer = categoryOffer;
            product.salePrice = product.regularPrice * (1 - categoryOffer / 100);
            await product.save();
        }

        res.redirect('/admin/categoryOffers');
    } catch (err) {
        console.error('Error adding category offer:', err);
        res.redirect("/admin/pageError");
    }
};


const toggleCategoryOffer = async (req, res) => {
    const offerId = req.params.id;
    try {
        const offer = await CategoryOffer.findById(offerId);
        if (!offer) {
            return res.status(404).send('Offer not found');
        }
        const categoryId = offer.categoryId
        const category = await Category.findById(categoryId);
        const productsInThisCategory = await Product.find({ category: categoryId })
        if (offer.isActive) {
            category.categoryOffer = 0
            await category.save();

            for (let product of productsInThisCategory) {
                product.productOffer = 0
                await product.save()
            }
        } else {
            category.categoryOffer = offer.categoryOffer
            await category.save()

            const otherOffers = await CategoryOffer.find({ categoryId, _id: { $ne: offer._id } });
            for (let offer of otherOffers) {
                offer.isActive = false;
                await offer.save()
            }

            for (let product of productsInThisCategory) {
                product.categoryOffer = offer.categoryOffer
                await product.save()
            }
        }
        offer.isActive = !offer.isActive;
        await offer.save();
        res.redirect('/admin/categoryOffers');
    } catch (error) {
        console.error('Error toggling offer status:', error);
        res.redirect("/admin/pageError")
    }
};
const deleteCategoryOffer = async (req, res) => {
    const offerId = req.params.id;
    try {
        const offer = await CategoryOffer.findByIdAndDelete(offerId);
        const categoryId = offer.categoryId
        const category = await Category.findById(categoryId);
        const productsInThisCategory = await Product.find({ category: categoryId })
        category.categoryOffer = 0
        await category.save()

        for (let product of productsInThisCategory) {
            product.categoryOffer = 0
            await product.save()
        }
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        return res.status(200).json({ message: "Category Offer deleted successfully" });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.redirect("/admin/pageError")
    }
};

module.exports = {
    getProductOffers,
    loadAddProductOfferPage,
    addProductOffer,
    toggleProductOffer,
    deleteProductOffer,
    getCategoryOffers,
    loadAddCategoryOfferPage,
    addCategoryOffer,
    toggleCategoryOffer,
    deleteCategoryOffer


}
