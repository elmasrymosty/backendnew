const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { Banner } = require('../models/Banner');
const { cloudinary, storage } = require('../cloudinary');
const upload = multer({ storage });

// ✅  deleteloudinary
const deleteImagesFromCloudinary = async (images) => {
  if (!images || !images.length) return;
  const deletions = images.map(img => cloudinary.uploader.destroy(img.public_id));
  await Promise.all(deletions);
};

// ✅ new 
router.post('/', upload.array('images', 7), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ message: 'No images uploaded.' });
    }

    const images = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadToCloudinary(file.path);
        return {
          url: result.secure_url,
          public_id: result.public_id,
        };
      })
    );

    const banner = new Banner({ images });
    await banner.save();

    res.status(201).json({
      message: 'Images uploaded successfully',
      bannerId: banner._id,
      images: banner.images,
    });
  } catch (error) {
    console.error('🔥 POST /api/v1/banners error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ✅ fetsh 
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({}, 'images _id');
    res.status(200).json({ status: 'success', data: banners });
  } catch (error) {
    console.error('🔥 GET /api/v1/banners error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ✅ single banner idID
router.get('/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.status(200).json(banner);
  } catch (error) {
    console.error('🔥 GET /api/v1/banners/:id error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ✅ updated banner

// 📌 Update an existing banner
router.put('/update/:id', upload.array('images', 10), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid banner ID' });
    }

    const images = await Promise.all(req.files.map(file => uploadToCloudinary(file.path)));

    const updatedBanner = await Banner.findByIdAndUpdate(
      req.params.id,
      { images },
      { new: true }
    );

    if (!updatedBanner) {
      return res.status(500).json({ message: 'The banner cannot be updated!' });
    }

    res.status(200).json(updatedBanner);
  } catch (error) {
    console.error('🔥 PUT /banners/:id error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});


// ✅ حذف بنر
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);
    if (!banner) return res.status(404).json({ message: 'Banner not found!' });

    await deleteImagesFromCloudinary(banner.images);
    await banner.remove();

    res.status(200).json({ success: true, message: 'The banner is deleted!' });
  } catch (error) {
    console.error('🔥 DELETE /api/v1/banners/:id error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
