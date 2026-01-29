const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  Date: {
    type: String,
    required: true
  },
  Open: {
    type: Number,
    required: true
  },
  High: {
    type: Number,
    required: true
  },
  Low: {
    type: Number,
    required: true
  },
  Close: {
    type: Number,
    required: true
  },
  Volume: {
    type: Number,
    required: true
  },
  Dividends: {
    type: Number,
    default: 0
  },
  'Stock Splits': {
    type: Number,
    default: 0
  },
  Company: {
    type: String,
    required: true
  }
}, {
  collection: 'stocks',
  timestamps: false
});


stockSchema.index({ Date: 1, Company: 1 });

const Stock = mongoose.model('Stock', stockSchema);

module.exports = Stock;