var assert = require('assert');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/example1');

var options = { discriminatorKey: 'kind' };

var eventSchema = new mongoose.Schema({
  // The time the event took place
  time: {
    type: Date,
    default: Date.now
  }
}, options);

var clickedLinkEventSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true }
}, options);

var purchasedEventSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
}, options);

var Event = mongoose.model('Event', eventSchema);
var ClickedLinkEvent = Event.discriminator('ClickedLink',
  clickedLinkEventSchema);
var PurchasedEvent = Event.discriminator('Purchased', purchasedEventSchema);

Event.aggregate([
  {
    $match: {
      $or: [
        { kind: 'ClickedLink', to: '/product/00000000000000000000000c' },
        {
          kind: 'Purchased',
          product: mongoose.Types.ObjectId('00000000000000000000000c')
        }
      ]
    }
  },
  {
    $group: {
      _id: '$kind',
      count: { $sum: 1 }
    }
  }
]).exec(function(error, result) {
  assert.ifError(error);
  console.log(require('util').inspect(result));
  process.exit(0);
});
