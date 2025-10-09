import mongoose from "mongoose";

const WhiteboardSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  shapes: { type: Array, default: [] },
});

export default mongoose.models.Whiteboard ||
  mongoose.model("Whiteboard", WhiteboardSchema);
