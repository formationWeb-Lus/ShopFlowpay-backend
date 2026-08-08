
import multer from "multer";

/* =========================================================
   STORAGE
========================================================= */

/*
 * memoryStorage() est utilisé parce que nous voulons
 * envoyer directement le fichier vers Supabase Storage.
 *
 * Le fichier n'est PAS enregistré sur le disque du serveur.
 */
const storage =
  multer.memoryStorage();

/* =========================================================
   ALLOWED IMAGE TYPES
========================================================= */

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/* =========================================================
   UPLOAD CONFIGURATION
========================================================= */

export const uploadProductImage =
  multer({
    storage,

    limits: {
      /*
       * Maximum : 5 MB
       */
      fileSize:
        5 * 1024 * 1024,
    },

    fileFilter: (
      req,
      file,
      callback
    ) => {
      if (
        allowedMimeTypes.includes(
          file.mimetype
        )
      ) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          "Format d'image non supporté. Utilisez JPG, JPEG, PNG ou WEBP."
        )
      );
    },
  });