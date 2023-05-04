const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    comment: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'

    }
})

module.exports = mongoose.model('Review', reviewSchema);
