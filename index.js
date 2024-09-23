import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import bcrypt, { hash } from "bcrypt"
import connnetDB from "./db/index.js"
import User from "./models/user.models.js"
import Data from "./models/data.models.js"

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

//to get the users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find()
    res.status(200).json(users)
  } catch (error) {
    console.error(error)
  }
})

//to get the particular user data
app.get("/users/:userId", async (req, res) => {
  const { userId } = req.params

  try {
    const user = await User.findById(userId).populate("data")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const sortedData = user.data.sort(
      (a, b) => new Date(a.createdAt - b.createdAt)
    )
    return res.status(200).json(sortedData)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Server error" })
  }
})

//to signup
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body

    const userCheck = await User.findOne({ email })

    if (userCheck) {
      res.status(409).json({ message: "User already exists with this email" })
    }
    const salt = 10
    const hashedPassword = async (password) => {
      try {
        const hased = await bcrypt.hash(password, salt)
        return hased
      } catch (error) {
        console.log("Error while hashing password", error)
      }
    }

    const user = new User({ name, email, password: hashedPassword })
    await user.save()

    res.status(201).json({
      message:
        "Got your credentials🥳 Bingo! You're now part of the family. Cheers! 🥂",
    })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

//to login
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
      const isMatch = await bcrypt.compare(passCheck, emailCheck.passsword)
      if (isMatch) {
        return res.status(200).json({
          message: "Successfully logged in",
          userId: emailCheck._id,
          name: emailCheck.name,
        })
      } else {
        return res.status(401).json({ message: "Invaid password" })
      }
    }
  } catch (error) {
    console.error("Error at login", error)
  }
})

//to delete user
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params

  try {
    await Data.deleteMany({ user: id })
    const result = await User.deleteOne({ _id: id })
    if (result.deleteCount > 0) {
      return res
        .status(200)
        .json({ message: "User and data deleted successfully" })
    } else {
      return res.status(404).json({ message: "User not found" })
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error deleting user" })
  }
})

//to post the data for that user
app.post("/users/:userId/data", async (req, res) => {
  const { category, amount, budget } = req.body
  const { userId } = req.params

  try {
    const userCheck = await User.findById(userId)

    if (!userCheck) {
      return res.status(404).json({ message: "User not found" })
    }

    const checkCategory = await Data.findOne({ user: userId, category })
    if (checkCategory) {
      checkCategory.amount += amount
      await checkCategory.save()

      return res.status(200).json({
        message: "Amount added successfully",
        data: checkCategory,
      })
    }

    const dataChange = await Data.findOne({ user: userId })
    if (!dataChange) {
      dataChange = new Data({
        user: userId,
        budget: 500,
      })
      await dataChange.save()
    }

    if (budget !== undefined) {
      const prevBudget = dataChange.budget
      dataChange.budget = budget
      await dataChange.save()
      if (budget > prevBudget) {
        return res.status(200).json({
          message: "Budget increased successfully! 💰📈",
          budgetAmount: budget,
          prevData: prevBudget,
        })
      } else if (budget < prevBudget) {
        return res.status(200).json({
          message: "Budget decreased successfully! 💰📉",
          budgetAmount: budget,
          prevData: prevBudget,
        })
      } else {
        return res.status(200).json({
          message: "Budget remains same! 💰📊",
          budgetAmount: budget,
          prevData: prevBudget,
        })
      }
    }

    const newData = new Data({
      user: userId,
      category,
      amount,
    })

    await newData.save()
    userCheck.data.push(newData._id)
    await userCheck.save()

    return res.status(201).json({
      message: "Expense added successfully",
      data: newData,
      user: userId,
    })
  } catch (error) {
    return res.status(500).json({ message: "Error adding expense", error })
  }
})

//to delete the particular data for that user
app.delete("/users/:userId/data/:dataId", async (req, res) => {
  const { userId, dataId } = req.params

  try {
    const userExists = await User.findOne({ _id: userId })
    if (!userExists) {
      return res.status(404).json({ message: "User not found" })
    }

    const deletedData = await Data.deleteOne({ _id: dataId, user: userId })
    if (deletedData.deletedCount === 0) {
      return res.status(404).json({ message: "Data not found" })
    }

    userExists.data = userExists.data.filter((id) => id.toString() !== dataId)
    await userExists.save()

    return res.status(200).json({ message: "Data deleted successfully" })
  } catch (error) {
    return res.status(404).json({ error: "Invalid at deleting data" })
  }
})
