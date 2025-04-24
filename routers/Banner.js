const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { Banner } = require('../models/Banner');
const { cloudinary, storage } = require('../cloudinary');
const upload = multer({ storage });

// 🔧 Utility: Extract Cloudinary public_id from URL
const getPublicIdFromUrl = (url) => {
  const matches = url.match(/\/([^/]+)\.(jpg|jpeg|png|webp|gif)$/i);
  return matches ? matches[1] : null;
};

// 🔧 Utility: Delete images from Cloudinary
const deleteImagesFromCloudinary = async (images = []) => {
  for (const img of images) {
    const publicId = typeof img === 'string' ? getPublicIdFromUrl(img) : img.public_id;
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error(`❌ Failed to delete image: ${publicId}`, err.message);
      }
    }
  }
};

// ✅ POST - Upload multiple images
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
    await banner.save();

    res.status(201).json({ images });
  } catch (error) {
    console.error('🔥 POST error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ GET - All banner images
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({}, 'images');
    res.status(200).json({ status: 'success', data: banners });
  } catch (error) {
    console.error('🔥 GET all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ GET - Single banner by ID
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

// ✅ PUT - Update banner images using FormData (same style as POST)
router.put('/:id', upload.array('images', 7), async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🔁 PUT called for banner ID:', id);
      console.log('📦 Received files:', req.files);
  
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid banner ID' });
      }
  
      const banner = await Banner.findById(id);
      if (!banner) return res.status(404).json({ message: 'Banner not found' });
  
      // حذف الصور القديمة فقط إذا كانت موجودة
      if (banner.images && banner.images.length > 0) {
        await deleteImagesFromCloudinary(banner.images);
      }
  
      // التحقق من وجود صور جديدة
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No new images uploaded.' });
      }
  
      const newImages = req.files.map(file => ({
        url: file.path,
        public_id: file.filename,
      }));
  
      banner.images = newImages;
      await banner.save();
  
      res.status(200).json({ images: banner.images });
    } catch (error) {
        console.error('🔥 Error in PUT /banners/:id', error.message, error.stack);
        console.log(JSON.stringify(error, null, 2));

      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });
  
  

// ✅ DELETE - Remove banner and its images
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
