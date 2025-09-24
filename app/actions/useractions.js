"use server"

import connectdb from "@/lib/mgdb";
import Strokes from "@/models/strokes";

export const addstrokes = async (data) => {
  await connectdb();

   const wb = new Strokes({
    // color,size,
    strokes: [
      {
        points: data.arr
      }
    ]
  });

  await wb.save();
}
export const getstrokes = async () => {
  await connectdb();

  const wb = await Strokes.find({}).lean();

  // keep each stroke as a separate array of points
  const strokesPoints = wb.flatMap(doc => 
    doc.strokes.map(stroke => 
      stroke.points.map(pt => ({ x: pt.x, y: pt.y }))
    )
  );

  console.log(strokesPoints);
  return strokesPoints;
}
