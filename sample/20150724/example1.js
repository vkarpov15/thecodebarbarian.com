var assert = require('assert');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/example1');

var eventSchema = new mongoose.Schema({
  // The type of event
  kind: {
    type: String,
    required: true,
    enum: ['ClickedLink', 'Purchased']
  },
  // The time the event took place
  time: {
    type: Date,
    default: Date.now
  },
  /* Arbitrary data associated with the event.
   * `{}` corresponds to `Mixed` type in mongoose,
   * so no validation is run on this field */
  data: {}
});

var Event = mongoose.model('Event', eventSchema);

var e = new Event({
  kind: 'ClickedLink',
  data: { badField: 'abc' }
});

assert.ifError(e.validateSync());
process.exit(0);
