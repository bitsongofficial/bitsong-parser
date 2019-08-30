const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

/**
 * Model for a single block.
 *
 * @type {"mongoose".Schema}
 */
const blockSchema = new Schema(
  {
    height: {
      type: Number,
      required: true,
      index: true
    },
    hash: {
      type: String,
      required: true,
      index: true
    },
    time: {
      type: Date,
      required: true
    },
    num_txs: {
      type: Number
    },
    proposer: {
      type: String,
      required: true
    }
  },
  {
    _id: false,
    id: false,
    versionKey: false,
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
);

blockSchema.virtual("success").get(function() {
  if (this.hasOwnProperty("error")) {
    return this.error === "";
  }
});

blockSchema.plugin(mongoosePaginate);

export const Block = mongoose.model("Block", blockSchema);
