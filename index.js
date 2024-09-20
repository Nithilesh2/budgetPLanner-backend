import dotenv from "dotenv"
import express from "express"
import cors from "cors"

import connnetDB from "./db/index.js"
import User from "./models/user.models.js"

const app = express()

app.use(express.json())
app.use(cors())

dotenv.config({
  path: "./.env",
})

connnetDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("Server is running on port " + process.env.PORT)
    })
  })
  .catch((err) => {
    console.error(err)
  })

app.get("/users", async (req, res) => {
  try {
    const users = await User.find()
    res.status(200).json(users)
  } catch (error) {
    console.error(error)
  }
})

app.post("/signup", async (req, res) => {
  try {
    const { email, password, RePassword } = req.body

    const userCheck = await User.findOne({ email })

    if (userCheck) {
      res.status(409).json({ message: "User already exists with this email" })
    }

    const user = new User({
      email,
      password,
      RePassword,
    })
    await user.save()

    res.status(201).json({
      message:
        "Got your credentials🥳 Bingo! You're now part of the family. Cheers! 🥂",
    })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params

  try {
    const result = await User.deleteOne({ _id: id })
    if (result) {
      res.status(200).json({ message: "Deleted successfully" })
    } else {
      res.json("Error")
    }
  } catch (error) {
    console.log(error)
  }
})

app.post("/login", async (req, res) => {
  const { email, password } = req.body

  try {
    const emailCheck = await User.findOne({ email })
    const passCheck = await User.findOne({ password })
    if (!emailCheck) {
      return res.status(404).json({ message: "Email incorrect" })
    }
    if (!passCheck) {
      return res.status(401).json({ message: "Password incorrect" })
    }

    if (emailCheck) {
      if (passCheck) {
        res.status(200).json({ message: "Successfully logged in" })
      }
    }
  } catch (error) {
    console.error("Error at login", error)
  }
})
