const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

/**
 * Model for a single validator.
 *
 * @type {"mongoose".Schema}
 */
const validatorSchema = new Schema({
    height: {
        type: Number,
        required: true,
        index: true
    }
}, {
    _id: false,
    id: false,
    versionKey: false,
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});

validatorSchema.virtual("success").get(function() {
    if (this.hasOwnProperty("error")) {
        return this.error === "";
    }
});

validatorSchema.plugin(mongoosePaginate);

export const Validator = mongoose.model("Validator", validatorSchema );