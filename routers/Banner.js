const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { Banner } = require('../models/Banner');
const { cloudinary, storage } = require('../cloudinary'); // تأكد من صحة هذا المسار
const upload = multer({ storage });

// Helper to delete images from Cloudinary
const deleteImagesFromCloudinary = async (images = []) => {
  for (const img of images) {
    const publicId = typeof img === 'string' ? getPublicIdFromUrl(img) : img.public_id;
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error(`Failed to delete image: ${publicId}`, err.message);
      }
    }
  }
};

// Extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  const matches = url.match(/\/([^/]+)\.(jpg|jpeg|png|webp|gif)$/i);
  return matches ? matches[1] : null;
};

// POST - Upload multiple images
router.post('/', upload.array('images', 7), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded.' });
    }

    const imageUrls = req.files.map(file => file.path);
    const banner = new Banner({ images: imageUrls });
    await banner.save();

    res.status(201).json({ images: imageUrls });
  } catch (error) {
    console.error('Upload error:', error); // ✅ مهم للطباعة الصحيحة
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// GET all banner images
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({}, 'images');
    res.status(200).json({ status: 'success', data: banners });
  } catch (error) {
    console.error('Fetch all error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET banner by ID
router.get('/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner
