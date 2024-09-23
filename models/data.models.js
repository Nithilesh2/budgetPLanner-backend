import mongoose from "mongoose"

const dataSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
      default: 500,

    },
    remaining: {
      type: Number,
    },
    spents: {
      type: Number,
    },
  },
  { timestamps: true }
)
dataSchema.index({ user: 1, category: 1 }, { unique: true })

const Data = mongoose.model("Data", dataSchema)

export default Data
