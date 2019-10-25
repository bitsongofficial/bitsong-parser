const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

/**
 * Model for a single validator.
 *
 * @type {"mongoose".Schema}
 */
const validatorSchema = new Schema(
  {
    address: {
      type: String,
      index: true
    },
    operator_address: {
      type: String,
      required: true,
      index: true
    },
    delegator_address: {
      type: String,
      index: true
    },
    consensus_pubkey: {
      type: String,
      required: true,
      index: true
    },
    jailed: {
      type: Boolean,
      default: false,
      required: true
    },
    status: {
      type: Number,
      default: 2,
      required: true
    },
    tokens: {
      type: String
    },
    delegator_shares: {
      type: String
    },
    description: {
      moniker: {
        type: String,
        index: true
      },
      identity: {
        type: String
      },
      website: {
        type: String
      },
      security_contact: {
        type: String
      },
      details: {
        type: String
      }
    },
    unbonding_height: {
      type: String
    },
    unbonding_time: {
      type: String
    },
    commission: {
      commission_rates: {
        rate: {
          type: String
        },
        max_rate: {
          type: String
        },
        max_change_rate: {
          type: String
        }
      },
      update_time: {
        type: String
      }
    },
    min_self_delegation: {
      type: String
    }
  },
  {
    versionKey: false
  }
);

// indices
validatorSchema.index({ address: 1 }, { name: "validatorAddressIndex" });

validatorSchema.plugin(mongoosePaginate);

export const Validator = mongoose.model("Validator", validatorSchema);
