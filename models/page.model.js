import mongoose from "mongoose";

const pageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    // 🧑 Owner of the page (single user)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",   // optional (only if you have a User model)
      required: true,
    },

    // 👥 Users who have access (shared users)
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",  // optional
      }
    ],
  },
  { timestamps: true }
);

const Page = mongoose.models.Page || mongoose.model("Page", pageSchema);
export default Page;
