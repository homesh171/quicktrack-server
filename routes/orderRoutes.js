import express from "express";
import Order, { STATUS_STEPS } from "../models/Order.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

const genOrderNumber = () =>
  "QT-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10);

// @route POST /api/orders  (customer places order)
router.post("/", protect, requireRole("customer"), async (req, res) => {
  try {
    const { pickupAddress, dropAddress, itemDescription } = req.body;
    const order = await Order.create({
      orderNumber: genOrderNumber(),
      customer: req.user.id,
      pickupAddress,
      dropAddress,
      itemDescription,
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/orders/mine  (customer's own orders)
router.get("/mine", protect, requireRole("customer"), async (req, res) => {
  const orders = await Order.find({ customer: req.user.id })
    .populate("rider", "name phone vehicleType")
    .sort({ createdAt: -1 });
  res.json(orders);
});

// @route GET /api/orders/assigned  (rider's assigned orders)
router.get("/assigned", protect, requireRole("rider"), async (req, res) => {
  const orders = await Order.find({ rider: req.user.id }).sort({ createdAt: -1 });
  res.json(orders);
});

// @route GET /api/orders  (admin - all orders)
router.get("/", protect, requireRole("admin"), async (req, res) => {
  const orders = await Order.find()
    .populate("customer", "name email")
    .populate("rider", "name phone")
    .sort({ createdAt: -1 });
  res.json(orders);
});

// @route GET /api/orders/:id  (single order - for tracking page)
router.get("/:id", protect, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("customer", "name email")
    .populate("rider", "name phone vehicleType");
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
});

// @route PUT /api/orders/:id/assign  (admin assigns rider)
router.put("/:id/assign", protect, requireRole("admin"), async (req, res) => {
  try {
    const { riderId } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { rider: riderId },
      { new: true }
    ).populate("rider", "name phone vehicleType");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // notify tracking room that a rider was assigned
    req.io.to(order._id.toString()).emit("orderUpdated", order);

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/orders/:id/status  (rider updates status) — THE KEY REAL-TIME ROUTE
router.put("/:id/status", protect, requireRole("rider"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUS_STEPS.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.rider?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not your assigned order" });
    }

    order.status = status;
    order.statusHistory.push({ status });
    await order.save();

    // 🔴 emit to everyone watching this order's tracking page
    req.io.to(order._id.toString()).emit("orderUpdated", order);

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/orders/:id/location  (rider sends live GPS - stretch feature)
router.put("/:id/location", protect, requireRole("rider"), async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { riderLocation: { lat, lng } },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    req.io.to(order._id.toString()).emit("riderLocationUpdated", { lat, lng });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
