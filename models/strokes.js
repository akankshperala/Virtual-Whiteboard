import mongoose from "mongoose";

const strokesSchema = new mongoose.Schema({
  strokes: [
    {
      color: String,
      size: Number,
      points: [
        {
          x: Number,
          y: Number
        }
      ]
    }
  ]},
  { timestamps: true }
);

const Strokes = mongoose.models.Strokes || mongoose.model("Strokes", strokesSchema);
export default Strokes;