// "use server"

// import connectdb from "@/lib/mgdb";
// import Strokes from "@/models/strokes";

// export const addstrokes = async (data) => {
//   await connectdb();

//   const wb = new Strokes({
//     strokes: [
//       {
//         shape:data.shape,
//         color: data.color, 
//         size: data.size,   
//         points: data.arr
//       }
//     ]
//   });

//   await wb.save();
//   // wb()
//   return {
//       // Ensure we safely pull color and size, providing defaults if necessary
//       id:wb._id.toString(),
//       shape:wb.stroke.shape || "pen",
//       color: wb.stroke.color || "black", 
//       size: wb.stroke.size || 5, 
//       points: wb.stroke.points.map(pt => ({ x: pt.x, y: pt.y }))
//     }
// }

// export const getstrokes = async () => {
//   await connectdb();

//   const docs = await Strokes.find({}).lean();

//   const strokesData = docs.flatMap(doc =>
//     doc.strokes.map(stroke => ({
//       // Ensure we safely pull color and size, providing defaults if necessary
//       id:doc._id,
//       shape:stroke.shape || "pen",
//       color: stroke.color || "black", 
//       size: stroke.size || 5, 
//       points: stroke.points.map(pt => ({ x: pt.x, y: pt.y }))
//     }))
//   );

//   return strokesData;
// }

// // actions/useractions.js// Update stroke by id using findOneAndUpdate
// export async function updateStroke(id, updatedData) {
//   try {
//     await connectdb();
//     const { value } = await db.collection("strokes").findOneAndUpdate(
//       { _id: new ObjectId(id) },
//       { $set: updatedData },
//       { returnDocument: "after" }
//     );
//     return value ? { id: value._id.toString(), ...value } : null;
//   } catch (err) {
//     console.error(err);
//     return null;
//   }
// }

// // Delete stroke by id
// export async function deleteStroke(id) {
//   try {
//     await connectdb();
//     const result = await db.collection("strokes").findOneAndDelete({ _id: new ObjectId(id) });
//     return result.value ? { id: result.value._id.toString(), ...result.value } : null;
//   } catch (err) {
//     console.error(err);
//     return null;
//   }
// }




"use server";

import connectdb from "@/lib/mgdb";
import Strokes from "@/models/strokes";
import mongoose from "mongoose";
import Page from "@/models/page.model";


// --- ADD STROKES ---
export const addstrokes = async (data) => {
  await connectdb();
  const wb = new Strokes({
    strokes: [
      {
        shape: data.shape,
        color: data.color,
        size: data.size || 5,
        points: data.arr,
        width: data.width,
        height: data.height,
        radius: data.radius
      },
    ],
  });

  const saved = await wb.save();
  const stroke = saved.strokes[0];

  // ✅ Return only plain JS object
  return {
    _id: saved._id.toString(),
    shape: stroke.shape || "pen",
    color: stroke.color || "black",
    size: stroke.size || 5,
    points: stroke.points.map((pt) => ({ x: pt.x, y: pt.y })),
    radius: stroke.radius,
    width: stroke.width || 0,
    height: stroke.height || 0,

  };
};

// --- GET STROKES ---
export const getstrokes = async () => {
  await connectdb();
  const docs = await Strokes.find({}).lean();

  // ✅ Convert _id to string safely
  const strokesData = docs.flatMap((doc) =>
    doc.strokes.map((stroke) => ({
      _id: doc._id.toString(),
      shape: stroke.shape || "pen",
      color: stroke.color || "black",
      size: stroke.size || 5,
      points: stroke.points.map((pt) => ({ x: pt.x, y: pt.y })),
      width: stroke.width || 0,
      height: stroke.height || 0,
      radius: stroke.radius || 0,
    }))
  );

  return strokesData;
};

// --- UPDATE STROKE ---
export async function updateStrokes(id, updatedData) {
  await connectdb();
  try {
    const objectId = new mongoose.Types.ObjectId(id);

    const updated = await Strokes.findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          "strokes.0.pageId": updatedData.pageId,
          "strokes.0.shape": updatedData.shape,
          "strokes.0.color": updatedData.color,
          "strokes.0.size": updatedData.size || 5,
          "strokes.0.points": updatedData.points,
          "strokes.0.width": updatedData.width || 0,
          "strokes.0.height": updatedData.height || 0,
          "strokes.0.radius": updatedData.radius || 0,

        },
      },
      { new: true }
    ).lean();
    if (!updated) return null;
    const stroke = updated.strokes[0];
    return {
      _id: updated._id.toString(),
      pageId:stroke.pageId,
      shape: stroke.shape,
      color: stroke.color,
      size: stroke.size,
      radius: stroke.radius,
      width: stroke.width,
      height: stroke.height,
      points: stroke.points.map(pt => ({ x: pt.x, y: pt.y })),
    };
  } catch (err) {
    console.error("Error updating stroke:", err);
    return null;
  }
}

// --- DELETE STROKE ---
export async function deleteStroke(id) {
  await connectdb();
  try {
    const objectId = new mongoose.Types.ObjectId(id);
    const deleted = await Strokes.findOneAndDelete({ _id: objectId }).lean();
    if (!deleted) return null;

    // return { _id: deleted._id.toString(), ...deleted };
  } catch (err) {
    console.error("Error deleting stroke:", err);
    return null;
  }
}

export async function clearAllStrokes(id) {
  await connectdb();
  try {
    const result = await Strokes.deleteMany({"strokes.pageId":String(id)});
    return { success: true, deleted: result.deletedCount };
  } catch (err) {
    console.error("Error clearing all strokes:", err);
    return { success: false, error: "Failed to clear all strokes" };
  }
}



/* ---------------------------------------------------------------------------
   NEW: Page-aware functions (additions only) — safe, backward-compatible
   -------------------------------------------------------------------------*/

// --- GET STROKES BY pageId ---
export async function getStrokesByPageId(pageId) {
  await connectdb();
  if (pageId){
    pageId:""
  }
  const docs = await Strokes.find({  "strokes.pageId": String(pageId)  }).lean();
  
  // console.log(docs[0].strokes)
  return docs.flatMap((doc) =>
    doc.strokes.map((stroke) => ({
      _id: doc._id.toString(),
      shape: stroke.shape || "pen",
      color: stroke.color || "black",
      size: stroke.size || 5,
      points: (stroke.points || []).map((pt) => ({ x: pt.x, y: pt.y })),
      width: stroke.width || 0,
      height: stroke.height || 0,
      radius: stroke.radius || 0,
    }))
  );
}

// --- ADD STROKE FOR A SPECIFIC PAGE ---
export const addStrokeForPage = async (data) => {
  await connectdb();


  const wb = new Strokes({
    strokes: [
      {
        pageId: data.pageId,
        shape: data.shape,
      
        color: data.color,
        size: data.size || 5,
        points: data.arr,
        width: data.width || 0,
        height: data.height || 0,
        radius: data.radius || 0,
      },
    ],
  });

  const saved = await wb.save();
  const stroke = saved.strokes[0];

  return {
    _id: saved._id.toString(),
    pageId: data.pageId,
    shape: stroke.shape,
    color: stroke.color,
    size: stroke.size,
    width: stroke.width || 0,
    height: stroke.height || 0,
    radius: stroke.radius || 0,
    points: (stroke.points || []).map((pt) => ({ x: pt.x, y: pt.y })),
  };
};

// --- CLEAR STROKES BY PAGE (optional helper) ---
export async function clearStrokesByPage(pageId) {
  await connectdb();
  try {
    const result = await Strokes.deleteMany({ pageId });
    return { success: true, deleted: result.deletedCount };
  } catch (err) {
    console.error("Error clearing strokes by page:", err);
    return { success: false, error: "Failed to clear strokes for page" };
  }
}

// --- CREATE NEW PAGE ---
export async function createNewPage(title = "Untitled Page",owner) {
  await connectdb();
  try {
    const page = await Page.create({ title,owner });
    return {
      pageId: page._id.toString(),
      title: page.title,
      createdAt: page.createdAt,
    };
  } catch (err) {
    console.error("createNewPage error:", err);
    throw err;
  }
}

// --- GET ALL PAGES (recent first) ---
export async function getAllPages(uid) {
  await connectdb();
  try {
    const pages = await Page.find().sort({ updatedAt: -1 }).lean();
    const arr=[]
    pages.map((item) => {
      const users = Array.isArray(item.users) ? item.users.map(u => String(u)) : [];
  const inUsers = users.includes(String(uid));
      if(item.owner==uid || inUsers){
        arr.push(item)
      }
})
// console.log(arr,"arr")
    return arr.map((p) => ({
      pageId: p._id.toString(),
      title: p.title,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
    }));
  } catch (err) {
    console.error("getAllPages error:", err);
    return [];
  }
}