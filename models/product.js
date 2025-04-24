// models/product.js

const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: String,
  public_id: String
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  discount: {
    type: Number
  },
  priceAfterDiscount: {
    type: Number
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  countInStock: {
    type: Number,
    required: true
  },
  rating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  image: imageSchema,
  images: [imageSchema]
}, {
  timestamps: true
});

exports.Product = mongoose.model('Product', productSchema);
