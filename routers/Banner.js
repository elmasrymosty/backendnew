const express = require('express');
const {Banner }= require('../models/Banner');
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
        fileSize: 1024 * 1024 * 6// maximum file size: 5MB
    }
}) // allow up to5 images to be uploaded


// Upload multiple images
router.post('/', uploadOption.array('images', 7), async (req, res) => {
  try {
    // Check if there are files uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded.' });
    }

    // Create an array to store the image paths
    const imagesPaths = [];

    // Loop through the uploaded files and process each one
    for (const file of req.files) {
      // Construct the image path
      const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
      const imagePath = basePath + file.filename;
      imagesPaths.push(imagePath);
    }

    // Save all image filenames to the database in one Banner object
    const banner = new Banner({ images: imagesPaths });
    await banner.save();

    // Send the response with the uploaded image paths
    res.status(201).json({ images: imagesPaths });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// GET method to retrieve all images
router.get('/', async (req, res) => {
  try {
    // Fetch all images from the database
    const images = await Banner.find({}, 'images'); // Only select the 'images' field

    console.log('Images from the database:', images); // Add this line for debugging

    if (images.length === 0) {
      return res.status(404).json({ message: 'No images found' });
    }

    res.status(200).json({ status: 'success', data: images });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});


  
  router.put('/:id', uploadOption.array('images', 10), async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid images Id' });
      }
  
      const files = req.files;
      let imagesPaths = [];
      const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
  
      if (files) {
        files.forEach((file) => {
          imagesPaths.push(`${basePath}${file.filename}`);
        });
      }
  
      // Construct updatedImages as an array of strings (file paths)
      const updatedImages = imagesPaths;
  
      const banner = await Banner.findByIdAndUpdate(
        req.params.id,
        {
          images: updatedImages,
        },
        { new: true }
      );
  
      if (!banner) return res.status(500).json({ message: 'The gallery cannot be updated!' });
  
      res.status(200).json({ images: banner.images });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

  router.get('/:id', async(req,res)=>{
    const banner = await Banner.findById(req.params.id);

    if(!banner) {
        res.status(500).json({message: 'The banner with the given ID was not found.'})
    } 
    res.status(200).send(banner);
})


// DELETE Bannerroute
router.delete('/:id', (req, res)=>{
  Banner.findByIdAndRemove(req.params.id).then(banner =>{
      if(banner) {
          return res.status(200).json({success: true, message: 'the banner is deleted!'})
      } else {
          return res.status(404).json({success: false , message: "banner not found!!!"})
      }
  }).catch(err=>{
     return res.status(500).json({success: false, error: err}) 
  })
})
  module.exports = router;