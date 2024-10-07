import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import bcrypt, { hash } from "bcrypt"
import connnetDB from "./db/index.js"
import User from "./models/user.models.js"
import Data from "./models/data.models.js"
import Group from "./models/group.models.js"
import GroupMembers from "./models/groupMembers.js"

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
    return res.status(200).json(users)
  } catch (error) {
    return res.status(500).json({ message: `failed to get data : ${error}` })
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
    return res.status(500).json({ message: "Server error" })
  }
})

//to signup
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body

    const userCheck = await User.findOne({ email })

    if (userCheck) {
      return res
        .status(409)
        .json({ message: "User already exists with this email" })
    }
    const salt = 10
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = new User({ name, email, password: hashedPassword })
    await user.save()

    return res.status(201).json({
      message:
        "Got your credentials🥳 Bingo! You're now part of the family. Cheers! 🥂",
      passwordData: hashedPassword,
    })
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" })
  }
})

//to login
app.post("/login", async (req, res) => {
  const { email, password } = req.body

  try {
    const emailCheck = await User.findOne({ email })
    if (!emailCheck) {
      return res.status(404).json({ message: "Email incorrect" })
    }
    const isMatch = await bcrypt.compare(password, emailCheck.password)

    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" })
    }
    return res.status(200).json({
      message: "Successfully logged in",
      userId: emailCheck._id,
      name: emailCheck.name,
    })
  } catch (error) {
    return res.status(500).json({ message: `error while login: ${error}` })
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

    let dataRecord = await Data.findOne({ user: userId, category })

    if (dataRecord) {
      dataRecord.amount += amount
      await dataRecord.save()

      return res.status(200).json({
        message: "Amount added successfully",
        data: dataRecord,
      })
    } else {
      const newData = new Data({
        user: userId,
        category,
        amount,
        budget: budget || 500,
      })

      await newData.save()

      userCheck.data.push(newData._id)
      await userCheck.save()

      return res.status(201).json({
        message: "New data created successfully",
        data: newData,
      })
    }
  } catch (error) {
    console.error("Error handling data:", error)
    res.status(500).json({ message: "Error handling data", error })
  }
})
//to update the budget
app.post("/users/:userId/budget", async (req, res) => {
  try {
    const { budget } = req.body
    const { userId } = req.params

    const userCheck = await User.findById(userId)
    if (!userCheck) {
      return res.status(404).json({ message: "User not found" })
    }

    const prevBudget = userCheck.budget
    userCheck.budget = budget
    await userCheck.save()

    if (prevBudget > budget) {
      return res.status(200).json({
        message: "Budget decreased successfully! 💰📉",
        budgetAmount: budget,
        prevBudget,
      })
    } else if (prevBudget < budget) {
      return res.status(200).json({
        message: "Budget increased successfully! 💰📈",
        budgetAmount: budget,
        prevBudget,
      })
    } else {
      return res.status(200).json({
        message: "Budget remains the same! 💰📊",
        budgetAmount: budget,
        prevBudget,
      })
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Getting error while updating budget: ${error}` })
  }
})

//send Budget
app.get("/users/:userId/budget", async (req, res) => {
  const { userId } = req.params
  try {
    const userCheck = await User.findById(userId)

    if (!userCheck) {
      return res.status(404).json({ message: "No user found" })
    }
    return res.status(200).json({ budget: userCheck.budget })
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Getting error while getting budget: ${error}` })
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

/*----------------------Group Box--------------------------*/

// To create Group
app.post("/create-group", async (req, res) => {
  const { groupName, groupPassword, groupMembers } = req.body

  const existingGroup = await Group.findOne({ groupName })
  if (existingGroup) {
    return res.status(409).json({ message: "Group name already exists" })
  }

  try {
    const newMember = await GroupMembers.create({
      members: groupMembers,
      spents: 0,
    })

    const salt = 10
    const hashedGroupPass = await bcrypt.hash(groupPassword, salt)

    const newGroup = await Group.create({
      groupName: groupName,
      groupPassword: hashedGroupPass,
      groupMembers: [newMember._id],
    })

    return res
      .status(201)
      .json({ message: "Group created successfully", group: newGroup })
  } catch (error) {
    return res
      .status(404)
      .message("getting error while creating group: ", error)
  }
})

// To Join Group
app.post("/join-group", async (req, res) => {
  const { groupName, groupPassword, groupMembers } = req.body

  try {
    const existingGroup = await Group.findOne({ groupName })
    if (!existingGroup) {
      return res.status(404).json({ message: "No group found" })
    }

    const checkPass = await bcrypt.compare(
      groupPassword,
      existingGroup.groupPassword
    )
    if (!checkPass) {
      return res.status(401).json({ message: "Entered wrong password" })
    }
    
    const existingMem = await GroupMembers.findOne({members: groupMembers})
    
    if (!existingMem) {
      const createNewMember = new GroupMembers({
        members: groupMembers,
        spents: 0,
      })

      existingGroup.groupMembers.push(createNewMember._id)

      await existingGroup.save()
      return res.status(200).json({ message: "User joined the group" })
    }
    
    const existingMemInGroup = existingGroup.groupMembers.includes(existingMem?._id)
    if(existingMemInGroup){
      return res.status(400).json({ message: "User is already in that group" })
    }

  } catch (error) {
    return res.status(404).json({ error: "While joining group" })
  }
})

// To get all groups
app.get("/groups", async (req, res) => {
  try {
    const groups = await Group.find()
    return res.status(200).json({ groups })
  } catch (error) {
    return res.status(404).json({ error: "Error while getting details" })
  }
})
