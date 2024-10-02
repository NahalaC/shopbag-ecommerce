const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/product-images/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});


const uploads = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, 
});


module.exports = uploads;
