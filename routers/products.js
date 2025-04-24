const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { cloudinary, storage } = require('../cloudinary');
const { Product } = require('../models/product');
const { Category } = require('../models/category');

const upload = multer({ storage });

// Helper to delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

// POST: Create Product
router.post('/', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]), async (req, res) => {
  try {
    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).send('Invalid Category');

    const singleImage = req.files.image?.[0] || null;
    const galleryImages = req.files.images || [];

    const image = singleImage ? {
      url: singleImage.path,
      public_id: singleImage.filename
    } : null;

    const images = galleryImages.map(file => ({
      url: file.path,
      public_id: file.filename
    }));

    const product = new Product({
      ...req.body,
      image,
      images
    });

    const savedProduct = await product.save();
    res.status(201).send(savedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// PUT: Update Product
router.put('/:productId', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]), async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).send('Product not found');

    // Delete old images from Cloudinary if new ones are uploaded
    if (req.files.image?.[0]) await deleteFromCloudinary(product.image?.public_id);
    if (req.files.images?.length) {
      for (const img of product.images) {
        await deleteFromCloudinary(img.public_id);
      }
    }

    // Set new image data
    if (req.files.image?.[0]) {
      product.image = {
        url: req.files.image[0].path,
        public_id: req.files.image[0].filename
      };
    }

    if (req.files.images?.length) {
      product.images = req.files.images.map(file => ({
        url: file.path,
        public_id: file.filename
      }));
    }

    Object.assign(product, req.body);
    const updated = await product.save();

    res.send(updated);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// DELETE: Remove Product and delete images from Cloudinary
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send('Product not found');

    if (product.image?.public_id) await deleteFromCloudinary(product.image.public_id);
    for (const img of product.images) {
      await deleteFromCloudinary(img.public_id);
    }

    await Product.findByIdAndRemove(req.params.id);
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

// GET: Get all products
router.get('/', async (req, res) => {
    try {
      const filter = req.query.categories ? { category: req.query.categories.split(',') } : {};
      const products = await Product.find(filter).populate('category');
      res.send(products);
    } catch (error) {
      console.error(error);
      res.status(500).send('Failed to fetch products');
    }
  });
  
  // GET: Get product count
  router.get('/get/count', async (req, res) => {
    try {
      const productCount = await Product.countDocuments();
      res.send({ productCount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false });
    }
  });
  
  // GET: Get featured products
  router.get('/get/featured/:count', async (req, res) => {
    try {
      const count = parseInt(req.params.count) || 0;
      const featured = await Product.find({ isFeatured: true }).limit(count);
      res.send(featured);
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false });
    }
  });
  
  // GET: Search products
  router.get('/products/search', async (req, res) => {
    const keyword = req.query.q;
    if (!keyword) return res.status(400).json({ error: 'Keyword is required.' });
  
    try {
      const results = await Product.find({ name: { $regex: keyword, $options: 'i' } });
      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

module.exports = router;
