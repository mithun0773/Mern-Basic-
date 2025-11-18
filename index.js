// backend/index.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors()); // allow browser requests (configure in prod)
app.use(express.json()); // parse JSON body

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Mongo connected"))
  .catch((err) => console.error("Mongo error", err));

// --- Schemas ---
const { Schema } = mongoose;
const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
});
const ProductSchema = new Schema({
  name: String,
  price: Number,
  description: String,
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", UserSchema);
const Product = mongoose.model("Product", ProductSchema);

// --- Auth helpers ---
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Middleware to protect routes
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization; // "Bearer <token>"
  if (!authHeader) return res.status(401).json({ message: "No token" });
  const parts = authHeader.split(" ");
  if (parts.length !== 2)
    return res.status(401).json({ message: "Invalid auth header" });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, iat, ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid" });
  }
}

// --- Routes ---
// Health
app.get("/", (req, res) => res.json({ ok: true }));

// Register
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "User exists" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res
      .status(201)
      .json({
        token,
        user: { id: user._id, email: user.email, name: user.name },
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({
    token,
    user: { id: user._id, email: user.email, name: user.name },
  });
});

// Public: get all products
app.get("/api/products", async (req, res) => {
  try {
    // Add try/catch if it's missing or inadequate
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");
    res.json(products);
  } catch (err) {
    console.error("Product fetch error:", err); // Log the error on the server
    res.status(500).send("Server Error"); // Send a generic response instead of crashing
  }
});

// Protected: create product
app.post("/api/products", authMiddleware, async (req, res) => {
  const { name, price, description } = req.body;
  if (!name || price == null)
    return res.status(400).json({ message: "Name and price required" });
  const product = await Product.create({
    name,
    price,
    description,
    createdBy: req.user.id,
  });
  res.status(201).json(product);
});

// Protected: delete product by id
app.delete("/api/products/:id", authMiddleware, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Not found" });
  // Optional: only allow creator to delete
  if (product.createdBy && product.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  await product.remove();
  res.json({ message: "Deleted" });
});

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));
