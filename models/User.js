const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        match: [/.+@.+\..+/, 'Please fill a valid email address']
    },
    password: { 
        type: String, 
        // required: function() { return !this.googleId; } // Only required if googleId is not present
        required:true
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
        default: true
      },
      phone : {
        type : String,
        required :true,
        unique:false,
        sparce:true,
        default:null,
    },
    // Google account ID
    googleId: { 
        type: String, 
        unique: true, 
       
    },
    cart:[{
      type: Schema.Types.ObjectId,
      ref:'Cart',
 }],
 wallet:{
    type:Number,
    default:0,

 },
 wishlist:[{
    type:Schema.Types.ObjectId,
    ref:'Wishlist'
 }],
 orderHistory:[{
    type: Schema.Types.ObjectId,
      ref:'Order',

 }],
 referalCode:{
    type:String,
    //required:false
 },
 redeemed:{
    type:Boolean,
    //default:false
 },
 redeemedUsers:[{
    type:Schema.Types.ObjectId,
    ref:'User',
    //required:true

 }],
 searchHistory:[{
    category:{
        type:Schema.Types.ObjectId,
    ref:'Category',
    },
 brand:{
    type:String
 },
 searchOn:{
    type:Date,
    default:Date.now
}
}],

 

    // storing OTP
    // otp: { 
    //     type: String 
    // },
    // OTP expiration time
    // otpExpiresAt: { 
    //     type: Date 
    // } 
});

// Indexes for OTP and expiration time for efficient querying
// userSchema.index({ otp: 1, otpExpiresAt: 1 });

// Pre-save hook to hash the password if it is being updated or created
// userSchema.pre('save', async function(next) {
//     if (!this.isModified('password')) {
//         return next();
//     }
//     try {
//         const salt = await bcrypt.genSalt(10);
//         this.password = await bcrypt.hash(this.password, salt);
//         next();
//     } catch (err) {
//         next(err);
//     }
// });

const User = mongoose.model('User', userSchema);

module.exports = User;
