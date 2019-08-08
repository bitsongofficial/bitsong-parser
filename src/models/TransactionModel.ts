const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;


/**
 * Model for a single transaction.
 *
 * @type {"mongoose".Schema}
 */
const transactionSchema = new Schema({
    hash: {
        type: String,
        required: true,
        index: true
    },
    height: {
        type: Number,
        required: true,
        index: true
    },
    msgs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    }],
    status: {
        type: Boolean,
        required: true
    },
    gas_wanted: {
        type: Number,
        required: true,
        index: true
    },
    gas_used: {
        type: Number,
        required: true,
        index: true
    },
    fee_amount: [],
    time: {
        type: Date,
        required: true
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

transactionSchema.virtual("success").get(function() {
    if (this.hasOwnProperty("error")) {
        return this.error === "";
    }
});

transactionSchema.plugin(mongoosePaginate);

export const Transaction = mongoose.model("Transaction", transactionSchema );