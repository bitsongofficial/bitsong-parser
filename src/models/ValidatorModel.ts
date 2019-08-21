const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

/**
 * Model for a single validator.
 *
 * @type {"mongoose".Schema}
 */
const validatorSchema = new Schema({
    address: {
        type: String,
        required: true,
        index: true
    },
    pub_key: {
        type: Object,
        required: true,
    },
    voting_power: {
        type: Number,
    },
    proposer_priority: {
        type: Number,
    },
    consensus_pubkey: {
        type: String,
        required: true,
        index: true
    },
    profile_url: {
        type: String
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