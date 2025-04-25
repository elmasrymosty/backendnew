const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { Banner } = require('../models/Banner');
const { cloudinary, storage } = require('../cloudinary');
const upload = multer({ storage });



// Upload multiple images
router.post('/', upload.array('images', 7), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ message: 'No images uploaded.' });
    }

    const images = req.files.map(file => ({
      url: file.path,
      public_id: file.filename,
    }));

    const banner = new Banner({ images });
    const imageUrls = req.files.map(file => file.url); // ✅ Clou // Cloudinary returns .path as URL
   // const banner = new Banner({ images: imageUrls });
    await banner.save();

    res.status(201).json({ images: imageUrls });
} catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
}
});
    
   // GET all banner images
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({}, 'images _id');
    res.status(200).json({ status: 'success', data: banners });
  } catch (error) {
    console.error('🔥 GET all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single banner by ID
router.get('/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.status(200).json(banner);
  } catch (error) {
    console.error('🔥 GET by ID error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Update banner images
router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
      if (!mongoose.isValidObjectId(req.params.id)) {
          return res.status(400).json({ message: 'Invalid banner ID' });
      }

      const imageUrls = req.files.map(file => file.path);

      const banner = await Banner.findByIdAndUpdate(
          req.params.id,
          { images: imageUrls },
          { new: true }
      );

      if (!banner) {
          return res.status(500).json({ message: 'The banner cannot be updated!' });
      }

      res.status(200).json({ images: banner.images });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
  }
});
// Delete a banner
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);
    if (!banner) return res.status(404).json({ message: 'Banner not found!' });

    await deleteImagesFromCloudinary(banner.images);
    await banner.remove();

    res.status(200).json({ success: true, message: 'The banner is deleted!' });
  } catch (error) {
    console.error('🔥 DELETE error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
