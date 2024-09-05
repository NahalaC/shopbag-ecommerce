const mongoose = require("mongoose");
const {Schema} = mongoose;


const productSchema = new Schema({
    productName : {
        type: String,
        required:true,
    },
    description: {
        type :String,
        required:true,
    },
    
    category: {
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true,
    },
    regularPrice:{
        type:Number,
        required:true,
    },
    salePrice:{
        type:Number,
        required:true
    },
    productOffer : {
        type:Number,
        default:0,
    },
    
    stock: [{
        size: {
          type: String,
          required: true,
        },
        quantity:{
            type:Number,
            default:true
        },
    }],
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    }
},{timestamps:true});

const Product = mongoose.model("Product",productSchema);

module.exports = Product;