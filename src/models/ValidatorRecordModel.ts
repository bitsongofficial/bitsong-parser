const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

/**
 * Model for a single validator.
 *
 * @type {"mongoose".Schema}
 */
const validatorRecordSchema = new Schema({
    height: {
        type: Number,
        required: true,
        index: true
    },
    validators: []
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

validatorRecordSchema.virtual("success").get(function() {
    if (this.hasOwnProperty("error")) {
        return this.error === "";
    }
});

validatorRecordSchema.plugin(mongoosePaginate);

export const ValidatorRecord = mongoose.model("validatorRecord", validatorRecordSchema );