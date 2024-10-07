import mongoose, { mongo } from "mongoose"

const membersSchema = mongoose.Schema(
  {
    members: {
      type: String,
      required: true,
    },
    spents: {
      type: Number,
    },
    membersData: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GroupMembersData",
      },
    ],
  },
  { timestamps: true }
)

const GroupMembers = mongoose.model('GroupMembers',membersSchema)
export default GroupMembers
