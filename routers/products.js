const { Product } = require('../models/product');
const express = require('express');
const { Category } = require('../models/category');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');

//
const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
    'image/jfif': 'jfif',
    'image/gif': 'gif',
    'image/webp': 'webp'

};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('invalid image type');

        if (isValid) {
            uploadError = null;
        }
        cb(uploadError, 'public/uploads');
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`);
    }
});



const uploadOption = multer({ 
    storage: storage, 
    fileFilter: function(req, file, callback) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        if (isValid) {
            callback(null, true);
        } else {
            callback(new Error('Only JPEG, JPG,webp,gif,jfif and PNG files are allowed'));
        }
    },
    limits: {
        fileSize: 1024 * 1024 * 5// maximum file size: 5MB
    }
}) // allow up to 10 images to be uploaded





// Route to add a new product with both single and multiple images
router.post('/', uploadOption.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 }
]), async (req, res) => {
   
        const category = await Category.findById(req.body.category);
        if (!category) return res.status(400).send('Invalid Category');
       
        const singleImageURL = req.protocol + '://' + req.get('host') + '/public/uploads/' + req.files.image[0].filename;

let imagesPaths = [];
if (req.files && req.files.images && req.files.images.length > 0) {
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
    imagesPaths = req.files.images.map((file) => basePath + file.filename);
    console.log('req.files.images:', req.files.images);
} else {
    console.error("No files provided.");
}

 
        let product = new Product({
          name: req.body.name,
          description: req.body.description,
          brand: req.body.brand,
          price: req.body.price,
          discount:req.body.discount,
          priceAfterDiscount:req.body.priceAfterDiscount,
          category: req.body.category,
          countInStock: req.body.countInStock, 
          rating: req.body.rating,
          numReviews: req.body.numReviews,
          isFeatured: req.body.isFeatured,
          image:singleImageURL, // Single image,
          images:imagesPaths,
        });
      
        product = await product.save();
      
        if (!product) return res.status(500).send('The product cannot be created');
      
        res.send(product);
      });

// Route to update a product by ID
router.put('/:productId', uploadOption.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]), async (req, res) => {
  try {
      const productId = req.params.productId;

      // Check if the product with the given ID exists
      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).send('Product not found');
      }

      // Update the product fields
      product.name = req.body.name;
      product.description = req.body.description;
      product.brand = req.body.brand;
      product.price = req.body.price;
      product.discount = req.body.discount;
      product.priceAfterDiscount = req.body.priceAfterDiscount;
      product.category = req.body.category;
      product.countInStock = req.body.countInStock;
      product.rating = req.body.rating;
      product.numReviews = req.body.numReviews;
      product.isFeatured = req.body.isFeatured;

      // Update images if provided
      if (req.files) {
          if (req.files.image && req.files.image.length > 0) {
              const singleImageURL = req.protocol + '://' + req.get('host') + '/public/uploads/' + req.files.image[0].filename;
              product.image = singleImageURL;
          }

          if (req.files.images && req.files.images.length > 0) {
              const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
              const imagesPaths = req.files.images.map((file) => basePath + file.filename);
              product.images = imagesPaths;
          }
      }

      // Save the updated product
      const updatedProduct = await product.save();

      if (!updatedProduct) {
          return res.status(500).send('Failed to update the product');
      }

      res.send(updatedProduct);
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
  }
});


router.get(`/`, async (req, res) => {
    let filter = {};
    if (req.query.categories) {
        filter = { category: req.query.categories.split(',') };
    }

    const productList = await Product.find(filter).populate('category');

    if (!productList) {
        res.status(500).json({ success: false });
    }
    res.send(productList);
});

router.get(`/:id`, async (req, res) => {
    const product = await Product.findById(req.params.id).populate('category');

    if (!product) {
        res.status(500).json({ success: false });
    }
    res.send(product);
});



router.delete('/:id', (req, res) => {
    Product.findByIdAndRemove(req.params.id)
        .then((product) => {
            if (product) {
                return res.status(200).json({
                    success: true,
                    message: 'the product is deleted!'
                });
            } else {
                return res.status(404).json({ success: false, message: 'product not found!' });
            }
        })
        .catch((err) => {
            return res.status(500).json({ success: false, error: err });
        });
});
const getProductCount = async () => {
    if (!getProductCount.cachedCount) {
      getProductCount.cachedCount = await Product.countDocuments();
    }
    return getProductCount.cachedCount;
  };
  router.get(`/get/count`, async (req, res) => {
    try {
      const productCount = await getProductCount();
  
      if (!productCount) {
        return res.status(500).json({ success: false });
      }
  
      res.send({
        productCount: productCount
      });
    } catch (error) {
      console.error('Error getting product count:', error);
      res.status(500).json({ success: false });
    }
  });
  
router.get(`/get/featured/:count`, async (req, res) => {
    try {
    const count = req.params.count ? req.params.count : 0;
    const products = await Product.find({ isFeatured: true }).limit(+count);

    if (!products) {
        res.status(500).json({ success: false });
    }
    res.send(products);}
    catch (err) {
        res.status(500).json({ success: false });
      }
   
});


// Endpoint to get a single product's image
router.get('/image/:id', async (req, res) => {
    const productId = req.params.id;
    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        return res.status(200).json({ image: product.image });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Endpoint to get a product's gallery images
router.get('/gallery/:id', async (req, res) => {
    const productId = req.params.id;
    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        return res.status(200).json({ images: product.images });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Search products by text input
router.get('/products/search', async (req, res) => {
  const keyword = req.query.q;

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required.' });
  }

  try {
    // Use Mongoose to search for products by name containing the keyword
    const searchResults = await Product.find({
      name: { $regex: new RegExp(keyword, 'i') }, // Case-insensitive search
    }).lean();

    // Exclude the _id field from each document in searchResults
    const resultsWithoutId = searchResults.map((result) => {
      const { _id, ...rest } = result;
      return rest;
    });

    res.json(resultsWithoutId);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
  

   



module.exports = router;
