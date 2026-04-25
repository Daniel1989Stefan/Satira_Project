import mongoose from "mongoose";
import { Post } from "../models/post.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  uploadOnCloudflare,
  deleteFromCloudflare,
} from "../utils/cloudflare.js";

///----Create Post---///

export const createPost = asyncHandler(async (req, res) => {
  // 1. Extragem datele de bază
  const { title, subtitle, category } = req.body;
  let blocksData = [];

  // Blocurile vor veni din frontend ca un string (text) pe care trebuie să îl transformăm înapoi în Array (JSON)
  try {
    blocksData = JSON.parse(req.body.blocks); //JSON.parse elimina string-ul lasand doar Obiectul
  } catch (error) {
    throw new ApiError(400, "Formatul blocurilor este invalid.");
  }

  if (!title || title.trim() === "") {
    throw new ApiError(400, "Titlul este obligatoriu.");
  }

  // 2. Extragem fișierele puse de Multer
  // Vom avea un fișier separat pentru coverImage și un array "blockFiles" pentru pozele din interior
  const coverImageFile = req.files?.coverImage ? req.files.coverImage[0] : null;
  const blockFiles = req.files?.blockFiles || [];

  if (!coverImageFile) {
    throw new ApiError(400, "Poza principală (Cover) este obligatorie.");
  }

  // 3. Uploadăm Poza Principală (Cover) pe Cloudflare
  const coverImageUrl = await uploadOnCloudflare(
    coverImageFile.path,
    coverImageFile.mimetype,
  );
  if (!coverImageUrl) {
    throw new ApiError(500, "Eroare la încărcarea pozei principale pe server.");
  }

  // 4. Procesăm Blocurile (Text, Imagini, Video) în ordinea exactă
  const processedBlocks = [];
  let currentFileIndex = 0; // Ține cont la a câta poză/video am ajuns în array-ul de fișiere

  for (const block of blocksData) {
    if (block.type === "text") {
      // Blocul de text se salvează direct
      processedBlocks.push({
        type: "text",
        content: block.content,
      });
    } else if (block.type === "image" || block.type === "video") {
      // Dacă e imagine/video, luăm fișierul corespunzător din pachetul primit
      const file = blockFiles[currentFileIndex];

      if (!file) {
        throw new ApiError(
          400,
          `Lipsește fișierul fizic pentru blocul de tip ${block.type}.`,
        );
      }

      // Îl urcăm pe Cloudflare
      const fileUrl = await uploadOnCloudflare(file.path, file.mimetype);
      if (!fileUrl) {
        throw new ApiError(
          500,
          `Eroare la încărcarea unui fișier (${block.type}).`,
        );
      }

      // Salvăm URL-ul și datele opționale
      processedBlocks.push({
        type: block.type,
        content: fileUrl,
        caption: block.caption || "",
        reference: block.reference || "",
      });

      currentFileIndex++; // Trecem la următorul fișier pentru următorul bloc
    }
  }

  // 5. Salvăm totul curat în baza de date
  const newPost = await Post.create({
    title: title.trim(),
    subtitle: subtitle ? subtitle.trim() : "",
    category:
      category && category.trim() !== ""
        ? category.trim().toLowerCase()
        : "default",
    coverImage: coverImageUrl,
    blocks: processedBlocks,
    author: req.user._id,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { post: newPost },
        "Postarea a fost creată cu succes!",
      ),
    );
});
///----End Create Post---///

///---Get All Posts---///
export const getAllPosts = asyncHandler(async (req, res) => {
  // 1. Preluăm datele pentru paginare din query (URL)
  // Dacă userul nu trimite ?page=... setăm default pagina 1, cu 10 postări pe pagină
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  // 2. Interogăm baza de date
  const posts = await Post.find()
    .sort({ createdAt: -1 }) // Sortăm descrescător (cele mai noi primele)
    .skip(skip) // Sărim peste postările de pe paginile anterioare
    .limit(limit) // Luăm doar numărul cerut
    .populate(
      "author",
      "fullname nickname email avatar role", // Alegem DOAR câmpurile pe care vrem să le vedem public (fără parole sau token-uri!)
    );

  // 3. Numărăm totalul de postări (util pentru Frontend ca să știe câte butoane de pagini să deseneze)
  const totalPosts = await Post.countDocuments();
  const totalPages = Math.ceil(totalPosts / limit);

  // 4. Returnăm răspunsul formatat
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        posts,
        pagination: {
          totalPosts,
          totalPages,
          currentPage: page,
          limit,
        },
      },
      "Postările au fost extrase cu succes!",
    ),
  );
});
///---END Get All Posts---///

///---Get Post By ID---///
export const getPostById = asyncHandler(async (req, res) => {
  // 1. Preluăm ID-ul din URL
  const { postId } = req.params;

  // 2. Verificăm dacă ID-ul are un format valid de MongoDB

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Formatul Id nu este corect");
  }

  // 3. Căutăm postarea și aducem datele autorului
  const post = await Post.findById(postId).populate(
    "author",
    "fullname nickname email avatar role",
  );

  // 4. Dacă nu găsim postarea (a fost ștearsă sau nu există)
  if (!post) {
    throw new ApiError(404, "Postarea nu a fost găsită");
  }

  // 5. Returnăm postarea
  return res
    .status(200)
    .json(
      new ApiResponse(200, { post }, "Post has been extracted with success!"),
    );
});
///---END Get Post By ID---///

///---Get Post By Category---///
export const getPostsByCategory = asyncHandler(async (req, res) => {
  // 1. Luăm categoria direct din URL (ex: /default/test)
  const { category } = req.params;

  // 2. Setăm paginarea (exact ca la getAllPosts)
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  // 3. Uniformizăm categoria căutată (pentru a ne asigura că se potrivește cu ce ai salvat în DB)
  const searchCategory = category.trim().toLowerCase();

  // 4. Interogăm baza de date, filtrând strict după acel câmp
  const posts = await Post.find({ category: searchCategory })
    .sort({ createdAt: -1 }) // Cele mai noi primele
    .skip(skip)
    .limit(limit)
    .populate("author", "fullname nickname email avatar role");

  // 5. Numărăm totalul de postări STRICT din această categorie
  const totalPosts = await Post.countDocuments({ category: searchCategory });
  const totalPages = Math.ceil(totalPosts / limit);

  // 6. Gestionăm cazul în care categoria nu există sau e goală
  if (!posts.length) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          posts: [],
          pagination: {
            totalPosts: 0,
            totalPages: 0,
            currentPage: page,
            limit,
          },
        },
        `Nu există postări în categoria: ${searchCategory}`,
      ),
    );
  }

  // 7. Returnăm datele găsite
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        posts,
        pagination: {
          totalPosts,
          totalPages,
          currentPage: page,
          limit,
        },
      },
      `Postările din categoria '${searchCategory}' au fost extrase cu succes!`,
    ),
  );
});
///---Get Post By Category---///

///---post unice 2---///
export const getUniqueCategories = asyncHandler(async (req, res) => {
  // Căutăm toate valorile unice din câmpul "category" din colecția Post
  const categories = await Post.distinct("category");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { categories },
        "Categoriile unice au fost extrase cu succes!",
      ),
    );
});
///---END post unice 2---///

///---Update Post---///
export const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Extragem datele de bază
  const { title, subtitle, category } = req.body;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Formatul ID-ului nu este valid.");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Postarea nu a fost găsită.");
  }

  // 1. Parsăm blocurile și fișierele de șters venite din Frontend
  let blocksData = [];
  let mediaToDelete = [];

  try {
    if (req.body.blocks) blocksData = JSON.parse(req.body.blocks);
    if (req.body.mediaToDelete)
      mediaToDelete = JSON.parse(req.body.mediaToDelete);
  } catch (error) {
    throw new ApiError(
      400,
      "Formatul blocurilor sau al fișierelor de șters este invalid.",
    );
  }

  // 2. Actualizăm textele de bază (Titlu, Subtitlu, Categorie)
  if (title && title.trim() !== "") post.title = title.trim();
  if (subtitle !== undefined) post.subtitle = subtitle.trim();
  if (category && category.trim() !== "")
    post.category = category.trim().toLowerCase();

  // 3. Gestionăm Poza Principală (Cover Image) dacă adminul a schimbat-o
  const coverImageFile = req.files?.coverImage ? req.files.coverImage[0] : null;

  if (coverImageFile) {
    if (post.coverImage) mediaToDelete.push(post.coverImage);

    // Urcăm noul cover
    const coverImageUrl = await uploadOnCloudflare(
      coverImageFile.path,
      coverImageFile.mimetype,
    );
    if (!coverImageUrl) {
      throw new ApiError(500, "Eroare la încărcarea noii poze principale.");
    }
    post.coverImage = coverImageUrl;
  }

  // 4. Ștergem de pe Cloudflare / Cloudinary fișierele pe care adminul le-a eliminat din articol
  if (mediaToDelete.length > 0) {
    try {
      await Promise.all(mediaToDelete.map((url) => deleteFromCloudflare(url)));
    } catch (error) {
      console.error("Eroare la procesul de ștergere imagini multiple:", error);
    }
  }

  // 5. Reconstruim lista de blocuri (doar dacă frontend-ul ne-a trimis blocurile modificate)
  if (blocksData.length > 0) {
    const processedBlocks = [];
    const blockFiles = req.files?.blockFiles || [];
    let currentFileIndex = 0;

    for (const block of blocksData) {
      if (block.type === "text") {
        // Dacă e text, îl salvăm direct, inclusiv modificările făcute de admin
        processedBlocks.push({
          type: "text",
          content: block.content,
        });
      } else if (block.type === "image" || block.type === "video") {
        // Cazul A: Adminul a păstrat poza/videoul vechi (frontend-ul trimite URL-ul existent)
        if (block.existingUrl) {
          processedBlocks.push({
            type: block.type,
            content: block.existingUrl, // Păstrăm link-ul vechi
            caption: block.caption || "", // Salvăm noul text explicativ dacă a fost schimbat
            reference: block.reference || "",
          });
        }
        // Cazul B: Adminul a adăugat un fișier NOU în timpul editării
        else {
          const file = blockFiles[currentFileIndex];
          if (!file) {
            throw new ApiError(
              400,
              `Lipsește fișierul fizic pentru blocul nou de tip ${block.type}.`,
            );
          }

          const fileUrl = await uploadOnCloudflare(file.path, file.mimetype);
          if (!fileUrl) {
            throw new ApiError(
              500,
              `Eroare la încărcarea unui fișier nou (${block.type}).`,
            );
          }

          processedBlocks.push({
            type: block.type,
            content: fileUrl,
            caption: block.caption || "",
            reference: block.reference || "",
          });

          currentFileIndex++; // Trecem la următorul fișier
        }
      }
    }

    // Suprascriem vechea structură de blocuri cu cea nouă și ordonată
    post.blocks = processedBlocks;
  }

  // 6. Salvăm totul în baza de date
  await post.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { post }, "Postarea a fost actualizată cu succes!"),
    );
});
///---END Update Post---///

export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Verificăm validitatea ID-ului
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Formatul ID-ului nu este valid.");
  }

  // Căutăm postarea
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Postarea nu a fost găsită.");
  }

  // 1. ȘTERGEM POZA PRINCIPALĂ (Cover Image)
  if (post.coverImage) {
    await deleteFromCloudflare(post.coverImage);
  }

  // 2. ȘTERGEM TOATE FIȘIERELE MEDIA DIN INTERIORUL POSTĂRII (Blocks)
  if (post.blocks && post.blocks.length > 0) {
    // Extragem doar blocurile care sunt imagini sau video și au un link salvat
    const filesToDelete = post.blocks
      .filter(
        (block) =>
          (block.type === "image" || block.type === "video") && block.content,
      )
      .map((block) => deleteFromCloudflare(block.content));

    // Dacă am găsit fișiere de șters, le ștergem pe toate în paralel pt viteză
    if (filesToDelete.length > 0) {
      await Promise.all(filesToDelete);
    }
  }

  // 3. ȘTERGEM POSTAREA DIN BAZA DE DATE
  await post.deleteOne();

  // 4. Returnăm răspunsul de succes
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Postarea și toate fișierele media asociate au fost șterse cu succes!",
      ),
    );
});
///---END Delete Post---///

///---Like or Dislike a Post---///
export const toggleVotePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { action } = req.body; // așteptăm să primim din frontend 'like' sau 'dislike'
  const userId = req.user._id; //primim de la Middleware-ul JWP, user-ul trebuie sa fie logat

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Formatul ID-ului postării este invalid");
  }

  if (action !== "like" && action !== "dislike") {
    throw new ApiError(
      400,
      "Acțiune invalidă. Trebuie să fie „like” sau „dislike”",
    );
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Postarea nu a fost găsită");
  }

  // Verificăm dacă user-ul se află deja în array-uri
  const hasLiked = post.likes.includes(userId);
  const hasDisliked = post.dislikes.includes(userId);

  if (action === "like") {
    if (hasLiked) {
      // 1. Dacă avea deja like și a apăsat iar like -> îi scoatem like-ul (Unlike)
      post.likes.pull(userId);
    } else {
      // 2. Nu avea like -> îi punem like-ul și ne asigurăm că îl scoatem de la dislike (dacă era)
      post.likes.push(userId);
      post.dislikes.pull(userId);
    }
  } else if (action === "dislike") {
    if (hasDisliked) {
      // 3. Dacă avea deja dislike și a apăsat iar dislike -> îi scoatem dislike-ul
      post.dislikes.pull(userId);
    } else {
      // 4. Nu avea dislike -> îi punem dislike și îi scoatem like-ul (dacă era)
      post.dislikes.push(userId);
      post.likes.pull(userId);
    }
  }

  // Salvăm modificările în baza de date
  await post.save();

  // Returnăm frontend-ului numărul actualizat pentru a-l afișa instant pe ecran
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalLikes: post.likes.length,
        totalDislikes: post.dislikes.length,
      },
      "Vote successfully registered",
    ),
  );
});
///---Like or Dislike a Post---///
