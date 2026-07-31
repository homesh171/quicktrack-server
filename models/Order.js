import mongoose from "mongoose";

const STATUS_STEPS = ["Placed", "Picked Up", "On the Way", "Delivered"];

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUS_STEPS, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rider: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    pickupAddress: { type: String, required: true },
    dropAddress: { type: String, required: true },
    itemDescription: { type: String, required: true },

    status: {
      type: String,
      enum: STATUS_STEPS,
      default: "Placed",
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: () => [{ status: "Placed" }],
    },

    // live rider coordinates (stretch feature)
    riderLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { timestamps: true }
);

export { STATUS_STEPS };
export default mongoose.model("Order", orderSchema);
