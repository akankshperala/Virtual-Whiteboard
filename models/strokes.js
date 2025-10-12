import mongoose from "mongoose";

const strokesSchema = new mongoose.Schema({
  strokes: [
    {
      shape:String,
      color: String,
      size: Number,
      width: Number,
      height: Number,
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