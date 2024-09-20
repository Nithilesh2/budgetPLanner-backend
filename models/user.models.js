import mongoose from "mongoose"

const userSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    requied: true,
  },
  RePassword: {
    type: String,
    required: true,
  },
})

const User = mongoose.model('User',userSchema)
export default User
