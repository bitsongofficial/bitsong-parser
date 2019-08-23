const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

/**
 * Model for a single validator.
 *
 * @type {"mongoose".Schema}
 */
const validatorUptimeSchema = new Schema({
  address: {
    type: String,
    required: true
  },
  misses: {
    type: Number,
    required: true,
    default: 0
  },
  period: {
    type: Number,
    required: true,
    default: 0
  }
});

export const ValidatorUptime = mongoose.model(
  "ValidatorUptime",
  validatorUptimeSchema
);
