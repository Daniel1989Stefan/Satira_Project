import mongoose from "mongoose";

// 1. Creăm o sub-schemă pentru "piesele de Lego" (Blocuri)
// Fiecare bloc știe ce este (text, poză, video) și ce conține.
const blockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["text", "image", "video"], // Acceptăm doar aceste 3 tipuri
    required: true,
  },
  content: {
    type: String,
    required: true, // Aici va fi ori textul, ori URL-ul pozei/videoclipului din Cloudflare
  },
  // Opționale pentru imagini:
  caption: {
    type: String,
    default: "", // Ce reprezintă poza
  },
  reference: {
    type: String,
    default: "", // De unde a fost luată (sursa)
  },
});

// 2. Schema principală a Postării
const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    coverImage: {
      type: String,
      required: true, // Poza inițială care va apărea pe paginile principale
    },
    category: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // Aici este magia: un array (listă) ordonat de blocuri
    blocks: [blockSchema],

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

export const Post = mongoose.model("Post", postSchema);
