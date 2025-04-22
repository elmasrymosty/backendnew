const mongoose = require('mongoose');
const bannerSchema = mongoose.Schema({
   
    images: [{
        type: String
    }],
  
})

bannerSchema.virtual('idString').get(function () {
    return this._id.toHexString();
});

bannerSchema.set('toJSON', {
    virtuals: true,
});
exports.Banner = mongoose.model('Banner', bannerSchema);