import mongoose from "mongoose";

const strokesSchema = new mongoose.Schema({
  strokes: [
    {
      pageId:{
        type: String,
        // required: true,
      },
      shape:String,
      color: String,
      size: Number,
      radius:Number,
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