const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { Banner } = require('../models/Banner');
const { cloudinary, storage } = require('../cloudinary');
const upload = multer({ storage });

// Helper to delete images from Cloudinary
const deleteImagesFromCloudinary = async (images = []) => {
  for (const img of images) {
    if (img.public_id) {
      try {
        await cloudinary.uploader.destroy(img.public_id);
      } catch (err) {
        console.error(`Failed to delete image: ${img.public_id}`, err.message);
      }
    }
  }
};

// POST - Upload multiple images
router.post('/', upload.array('images', 7), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded.' });
    }

    const images = req.files.map(file => ({
      url: file.path,
      public_id: file.filename
    }));

    const banner = new Banner({ images });
    await banner.save();

    res.status(201).json({ images });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET - All banner images
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({}, 'images');
    if (!banners.length) {
      return res.status(404).json({ message: 'No banners found' });
    }

    res.status(200).json({ status: 'success', data: banners });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET - Single banner by ID
router.get('/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    res.status(200).json(banner);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT - Update banner images
router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid banner ID' });
    }

    const oldBanner = await Banner.findById(id);
    if (!oldBanner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No new images uploaded.' });
    }

    await deleteImagesFromCloudinary(oldBanner.images);

    const newImages = req.files.map(file => ({
      url: file.path,
      public_id: file.filename
    }));

    oldBanner.images = newImages;
    const updatedBanner = await oldBanner.save();

    res.status(200).json({ images: updatedBanner.images });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Banner and its images
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found!' });
    }

    await deleteImagesFromCloudinary(banner.images);

    await banner.remove();
    res.status(200).json({ success: true, message: 'The banner is deleted!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
