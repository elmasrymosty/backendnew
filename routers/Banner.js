const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { Banner } = require('../models/Banner');
const { cloudinary, storage } = require('../cloudinary');
const upload = multer({ storage });

// ✅ دالة حذف الصور من Cloudinary
const deleteImagesFromCloudinary = async (images) => {
  if (!images || !images.length) return;
  const deletions = images.map(img => cloudinary.uploader.destroy(img.public_id));
  await Promise.all(deletions);
};

// ✅ إنشاء بنر جديد
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

    res.status(201).json({
      message: 'Images uploaded successfully',
      bannerId: banner._id,
      images: banner.images,
    });
  } catch (error) {
    console.error('🔥 POST /api/v1/banners error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ✅ جلب جميع البنرات
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({}, 'images _id');
    res.status(200).json({ status: 'success', data: banners });
  } catch (error) {
    console.error('🔥 GET /api/v1/banners error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ✅ جلب بنر واحد حسب ID
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

// ✅ تحديث بنر بصور جديدة
router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid banner ID' });
    }

    const newImages = req.files.map(file => ({
      url: file.path,
      public_id: file.filename,
    }));

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      { images: newImages },
      { new: true }
    );

    if (!banner) {
      return res.status(500).json({ message: 'The banner cannot be updated!' });
    }

    res.status(200).json({ images: banner.images });
  } catch (error) {
    console.error('🔥 PUT /api/v1/banners/:id error:', error);
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
