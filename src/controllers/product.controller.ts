
import { Request, Response } from "express";
import {
  ProductType,
  Currency,
  ProductStatus,
  ProductFieldType,
} from "@prisma/client";

import prisma from "../lib/prisma";

import {
  checkProductLimit,
} from "../services/subscription.service";

import {
  supabase,
} from "../config/supabase";

/* =========================================================
   TYPES
========================================================= */

interface ProductFieldInput {
  name: string;
  label: string;
  type: ProductFieldType;
  value?: string | null;
  required?: boolean;
}

interface CreateProductBody {
  name: string;
  subtitle?: string | null;
  description?: string | null;
  type: ProductType;
  price: number | string;
  currency: Currency;
  status?: ProductStatus;
  fields?: ProductFieldInput[];
}

/*
 * Express + Multer
 *
 * req.file n'est pas présent dans Request par défaut.
 * On utilise ce type local pour éviter les erreurs TypeScript.
 */
interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

/* =========================================================
   SUPABASE STORAGE CONFIGURATION
========================================================= */

/*
 * Nom du bucket Supabase Storage.
 *
 * Exemple dans Supabase :
 *
 * Storage
 *   └── product-images
 *
 * Le bucket doit être public si on utilise getPublicUrl().
 */
const PRODUCT_IMAGE_BUCKET = "product-images";

/* =========================================================
   USER ID
========================================================= */

function getUserId(req: Request): number | null {
  const userId = Number((req as any).user?.id);

  if (!userId || Number.isNaN(userId)) {
    return null;
  }

  return userId;
}

/* =========================================================
   PRODUCT INCLUDE
========================================================= */

const productInclude = {
  fields: true,

  paymentConfigs: true,

  paymentPageProducts: {
    include: {
      paymentPage: true,
    },
  },

  enrollments: true,

  socialPublications: true,
};

/* =========================================================
   IMAGE VALIDATION
========================================================= */

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Vérifie que le fichier image est valide.
 */
function validateImageFile(
  file?: Express.Multer.File
): string | null {
  if (!file) {
    return null;
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return (
      "Format d'image non supporté. " +
      "Utilisez JPG, JPEG, PNG ou WEBP."
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return (
      "L'image est trop volumineuse. " +
      "La taille maximale est de 5 Mo."
    );
  }

  return null;
}

/* =========================================================
   IMAGE PATH FROM SUPABASE URL
========================================================= */

/**
 * Extrait le chemin du fichier dans Supabase Storage
 * à partir de son URL publique.
 *
 * Exemple :
 *
 * https://xxxxx.supabase.co/storage/v1/object/public/
 * product-images/123/abc.jpg
 *
 * retourne :
 *
 * 123/abc.jpg
 */
function getStoragePathFromPublicUrl(
  imageUrl: string | null | undefined
): string | null {
  if (!imageUrl) {
    return null;
  }

  try {
    const marker =
      `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;

    const index =
      imageUrl.indexOf(marker);

    if (index === -1) {
      return null;
    }

    const path =
      imageUrl.substring(
        index + marker.length
      );

    return path || null;
  } catch {
    return null;
  }
}

/* =========================================================
   DELETE SUPABASE IMAGE
========================================================= */

async function deleteSupabaseImage(
  imageUrl?: string | null
): Promise<void> {
  if (!imageUrl) {
    return;
  }

  const storagePath =
    getStoragePathFromPublicUrl(
      imageUrl
    );

  if (!storagePath) {
    return;
  }

  try {
    const { error } =
      await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove([
          storagePath,
        ]);

    if (error) {
      console.error(
        "SUPABASE DELETE IMAGE ERROR:",
        error
      );
    }
  } catch (error) {
    console.error(
      "SUPABASE DELETE IMAGE EXCEPTION:",
      error
    );
  }
}

/* =========================================================
   UPLOAD PRODUCT IMAGE
========================================================= */

async function uploadProductImage(
  file: Express.Multer.File,
  userId: number,
  productId: number
): Promise<string> {
  const extension =
    getFileExtension(
      file.originalname,
      file.mimetype
    );

  /*
   * Nom unique.
   *
   * Exemple :
   *
   * 25/1691234567890-a8f92c.jpg
   */
  const fileName =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}${extension}`;

  /*
   * Chaque utilisateur possède son propre dossier.
   *
   * userId/productId/file
   */
  const storagePath =
    `${userId}/${productId}/${fileName}`;

  const { error } =
    await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(
        storagePath,
        file.buffer,
        {
          contentType:
            file.mimetype,

          cacheControl:
            "3600",

          upsert:
            false,
        }
      );

  if (error) {
    console.error(
      "SUPABASE UPLOAD ERROR:",
      error
    );

    throw new Error(
      "Impossible d'envoyer l'image vers Supabase."
    );
  }

  const {
    data,
  } =
    supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .getPublicUrl(
        storagePath
      );

  if (
    !data ||
    !data.publicUrl
  ) {
    /*
     * Si l'upload a réussi mais que
     * l'URL publique n'est pas disponible,
     * on tente de supprimer le fichier
     * pour éviter un fichier orphelin.
     */
    await deleteStoragePath(
      storagePath
    );

    throw new Error(
      "Impossible de récupérer l'URL publique de l'image."
    );
  }

  return data.publicUrl;
}

/* =========================================================
   GET FILE EXTENSION
========================================================= */

function getFileExtension(
  originalName: string,
  mimeType: string
): string {
  const extensionFromName =
    originalName
      .split(".")
      .pop()
      ?.toLowerCase();

  if (
    extensionFromName &&
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
    ].includes(extensionFromName)
  ) {
    return `.${extensionFromName}`;
  }

  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";

    case "image/png":
      return ".png";

    case "image/webp":
      return ".webp";

    default:
      return ".jpg";
  }
}

/* =========================================================
   DELETE STORAGE PATH
========================================================= */

async function deleteStoragePath(
  storagePath: string
): Promise<void> {
  try {
    const { error } =
      await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove([
          storagePath,
        ]);

    if (error) {
      console.error(
        "SUPABASE DELETE STORAGE PATH ERROR:",
        error
      );
    }
  } catch (error) {
    console.error(
      "SUPABASE DELETE STORAGE PATH EXCEPTION:",
      error
    );
  }
}

/* =========================================================
   PARSE FIELDS
========================================================= */

/**
 * Avec multipart/form-data, le champ `fields`
 * arrive souvent comme une chaîne JSON.
 *
 * Cette fonction accepte :
 *
 * fields: [...]
 *
 * ou :
 *
 * fields: "[...]"
 */
function parseFields(
  fieldsInput:
    | ProductFieldInput[]
    | string
    | undefined
): ProductFieldInput[] {
  if (
    fieldsInput === undefined ||
    fieldsInput === null
  ) {
    return [];
  }

  if (
    Array.isArray(fieldsInput)
  ) {
    return fieldsInput;
  }

  if (
    typeof fieldsInput === "string"
  ) {
    if (!fieldsInput.trim()) {
      return [];
    }

    try {
      const parsed =
        JSON.parse(fieldsInput);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      throw new Error(
        "Le format des champs personnalisés est invalide."
      );
    }
  }

  return [];
}

/* =========================================================
   VALIDATE PRODUCT BODY
========================================================= */

function validateProductBody(
  body: CreateProductBody,
  requireName = true
): string | null {
  const {
    name,
    type,
    price,
    currency,
    status,
    fields = [],
  } = body;

  /* -------------------------------------------------------
     NAME
  ------------------------------------------------------- */

  if (
    requireName &&
    (
      typeof name !== "string" ||
      !name.trim()
    )
  ) {
    return (
      "Le nom du produit est obligatoire."
    );
  }

  /* -------------------------------------------------------
     PRICE
  ------------------------------------------------------- */

  const numericPrice =
    Number(price);

  if (
    Number.isNaN(numericPrice) ||
    numericPrice < 0
  ) {
    return (
      "Le prix du produit est invalide."
    );
  }

  /* -------------------------------------------------------
     TYPE
  ------------------------------------------------------- */

  if (
    !Object.values(ProductType)
      .includes(type)
  ) {
    return (
      "Le type de produit est invalide."
    );
  }

  /* -------------------------------------------------------
     CURRENCY
  ------------------------------------------------------- */

  if (
    !Object.values(Currency)
      .includes(currency)
  ) {
    return (
      "La devise est invalide."
    );
  }

  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  if (
    status &&
    !Object.values(ProductStatus)
      .includes(status)
  ) {
    return (
      "Le statut du produit est invalide."
    );
  }

  /* -------------------------------------------------------
     FIELDS
  ------------------------------------------------------- */

  if (
    !Array.isArray(fields)
  ) {
    return (
      "Le format des champs personnalisés est invalide."
    );
  }

  const fieldNames =
    new Set<string>();

  for (
    let index = 0;
    index < fields.length;
    index++
  ) {
    const field =
      fields[index];

    if (
      !field ||
      typeof field !== "object"
    ) {
      return (
        `Le champ ${index + 1} est invalide.`
      );
    }

    /* -----------------------------------------------------
       FIELD NAME
    ----------------------------------------------------- */

    if (
      typeof field.name !== "string" ||
      !field.name.trim()
    ) {
      return (
        `Le nom technique du champ ${index + 1} est obligatoire.`
      );
    }

    const fieldName =
      field.name.trim();

    /* -----------------------------------------------------
       FIELD LABEL
    ----------------------------------------------------- */

    if (
      typeof field.label !== "string" ||
      !field.label.trim()
    ) {
      return (
        `Le libellé du champ ${index + 1} est obligatoire.`
      );
    }

    /* -----------------------------------------------------
       UNIQUE NAME
    ----------------------------------------------------- */

    if (
      fieldNames.has(fieldName)
    ) {
      return (
        `Le nom technique "${fieldName}" est utilisé plusieurs fois.`
      );
    }

    fieldNames.add(
      fieldName
    );

    /* -----------------------------------------------------
       FIELD TYPE
    ----------------------------------------------------- */

    if (
      !Object.values(ProductFieldType)
        .includes(field.type)
    ) {
      return (
        `Le type du champ "${fieldName}" est invalide.`
      );
    }
  }

  return null;
}

/* =========================================================
   CREATE PRODUCT
   POST /api/product
========================================================= */

export const createProduct = async (
  req: RequestWithFile,
  res: Response
) => {
  let uploadedImageUrl:
    | string
    | null = null;

  try {
    /* -----------------------------------------------------
       AUTH
    ----------------------------------------------------- */

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    /* -----------------------------------------------------
       BODY
    ----------------------------------------------------- */

    const rawBody =
      req.body || {};

    let fields:
      ProductFieldInput[] = [];

    try {
      fields =
        parseFields(
          rawBody.fields
        );
    } catch {
      return res.status(400).json({
        success: false,
        message:
          "Le format des champs personnalisés est invalide.",
      });
    }

    const body:
      CreateProductBody = {
      name:
        rawBody.name,

      subtitle:
        rawBody.subtitle,

      description:
        rawBody.description,

      type:
        rawBody.type,

      price:
        rawBody.price,

      currency:
        rawBody.currency,

      status:
        rawBody.status,

      fields,
    };

    /* -----------------------------------------------------
       IMAGE
    ----------------------------------------------------- */

    const imageError =
      validateImageFile(
        req.file
      );

    if (imageError) {
      return res.status(400).json({
        success: false,
        message:
          imageError,
      });
    }

    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    const validationError =
      validateProductBody(
        body
      );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message:
          validationError,
      });
    }

    const numericPrice =
      Number(
        body.price
      );

    const productStatus =
      body.status ||
      ProductStatus.DRAFT;

    /* -----------------------------------------------------
       CREATE PRODUCT
    ----------------------------------------------------- */

    /*
     * On crée d'abord le produit.
     *
     * Pourquoi ?
     *
     * Parce que l'image est rangée dans :
     *
     * userId/productId/image
     *
     * Nous avons donc besoin de l'id du produit.
     */

    const product =
      await prisma.product.create({
        data: {
          userId,

          name:
            body.name.trim(),

          subtitle:
            body.subtitle?.trim()
              ? body.subtitle.trim()
              : null,

          description:
            body.description?.trim()
              ? body.description.trim()
              : null,

          type:
            body.type,

          price:
            numericPrice,

          currency:
            body.currency,

          /*
           * L'image sera ajoutée juste
           * après la création du produit.
           */
          imageUrl:
            null,

          status:
            productStatus,

          fields:
            fields.length > 0
              ? {
                  create:
                    fields.map(
                      (
                        field
                      ) => ({
                        name:
                          field.name.trim(),

                        label:
                          field.label.trim(),

                        type:
                          field.type,

                        value:
                          field.value?.trim()
                            ? field.value.trim()
                            : null,

                        required:
                          Boolean(
                            field.required
                          ),
                      })
                    ),
                }
              : undefined,
        },
      });

    /* -----------------------------------------------------
       UPLOAD IMAGE
    ----------------------------------------------------- */

    if (req.file) {
      try {
        uploadedImageUrl =
          await uploadProductImage(
            req.file,
            userId,
            product.id
          );
      } catch (error) {
        /*
         * Si l'upload échoue,
         * on supprime le produit créé.
         */
        await prisma.product.delete({
          where: {
            id:
              product.id,
          },
        });

        throw error;
      }

      /* ---------------------------------------------------
         SAVE IMAGE URL
      --------------------------------------------------- */

      await prisma.product.update({
        where: {
          id:
            product.id,
        },

        data: {
          imageUrl:
            uploadedImageUrl,
        },
      });
    }

    /* -----------------------------------------------------
       GET COMPLETE PRODUCT
    ----------------------------------------------------- */

    const completeProduct =
      await prisma.product.findUnique({
        where: {
          id:
            product.id,
        },

        include:
          productInclude,
      });

    /* -----------------------------------------------------
       RESPONSE
    ----------------------------------------------------- */

    return res.status(201).json({
      success: true,

      message:
        "Produit créé avec succès.",

      product:
        completeProduct,
    });
  } catch (error) {
    console.error(
      "CREATE PRODUCT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Une erreur est survenue lors de la création du produit.",
    });
  }
};

/* =========================================================
   GET MY PRODUCTS
   GET /api/product
========================================================= */

export const getMyProducts = async (
  req: Request,
  res: Response
) => {
  try {
    /* -----------------------------------------------------
       AUTH
    ----------------------------------------------------- */

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Utilisateur non authentifié.",
      });
    }

    /* -----------------------------------------------------
       PRODUCTS
    ----------------------------------------------------- */

    const products =
      await prisma.product.findMany({
        where: {
          userId,
        },

        include:
          productInclude,

        orderBy: {
          createdAt:
            "desc",
        },
      });

    /* -----------------------------------------------------
       RESPONSE
    ----------------------------------------------------- */

    return res.status(200).json({
      success: true,

      total:
        products.length,

      products,
    });
  } catch (error) {
    console.error(
      "GET MY PRODUCTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Impossible de récupérer les produits.",
    });
  }
};

/* =========================================================
   GET PRODUCT BY ID
   GET /api/product/:id
========================================================= */

export const getProductById = async (
  req: Request,
  res: Response
) => {
  try {
    /* -----------------------------------------------------
       AUTH
    ----------------------------------------------------- */

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Utilisateur non authentifié.",
      });
    }

    /* -----------------------------------------------------
       ID
    ----------------------------------------------------- */

    const productId =
      Number(
        req.params.id
      );

    if (
      !productId ||
      Number.isNaN(productId)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Identifiant du produit invalide.",
      });
    }

    /* -----------------------------------------------------
       FIND PRODUCT
    ----------------------------------------------------- */

    const product =
      await prisma.product.findFirst({
        where: {
          id:
            productId,

          userId,
        },

        include:
          productInclude,
      });

    if (!product) {
      return res.status(404).json({
        success: false,

        message:
          "Produit introuvable.",
      });
    }

    /* -----------------------------------------------------
       RESPONSE
    ----------------------------------------------------- */

    return res.status(200).json({
      success: true,

      product,
    });
  } catch (error) {
    console.error(
      "GET PRODUCT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Impossible de récupérer le produit.",
    });
  }
};

/* =========================================================
   UPDATE PRODUCT
   PUT /api/product/:id
========================================================= */

export const updateProduct = async (
  req: RequestWithFile,
  res: Response
) => {
  let newImageUrl:
    | string
    | null = null;

  try {
    /* -----------------------------------------------------
       AUTH
    ----------------------------------------------------- */

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Utilisateur non authentifié.",
      });
    }

    /* -----------------------------------------------------
       ID
    ----------------------------------------------------- */

    const productId =
      Number(
        req.params.id
      );

    if (
      !productId ||
      Number.isNaN(productId)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Identifiant du produit invalide.",
      });
    }

    /* -----------------------------------------------------
       CHECK OWNERSHIP
    ----------------------------------------------------- */

    const existingProduct =
      await prisma.product.findFirst({
        where: {
          id:
            productId,

          userId,
        },
      });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,

        message:
          "Produit introuvable.",
      });
    }

    /* -----------------------------------------------------
       BODY
    ----------------------------------------------------- */

    const rawBody =
      req.body || {};

    let fields:
      ProductFieldInput[] | undefined;

    /*
     * Si fields n'est pas envoyé,
     * on conserve les anciens champs.
     */
    if (
      rawBody.fields !== undefined
    ) {
      try {
        fields =
          parseFields(
            rawBody.fields
          );
      } catch {
        return res.status(400).json({
          success: false,

          message:
            "Le format des champs personnalisés est invalide.",
        });
      }
    }

    const body:
      CreateProductBody = {
      name:
        rawBody.name,

      subtitle:
        rawBody.subtitle,

      description:
        rawBody.description,

      type:
        rawBody.type,

      price:
        rawBody.price,

      currency:
        rawBody.currency,

      status:
        rawBody.status,

      fields:
        fields || [],
    };

    /* -----------------------------------------------------
       IMAGE VALIDATION
    ----------------------------------------------------- */

    const imageError =
      validateImageFile(
        req.file
      );

    if (imageError) {
      return res.status(400).json({
        success: false,

        message:
          imageError,
      });
    }

    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    /*
     * Pour la mise à jour, les champs principaux
     * restent obligatoires dans cette API.
     */
    const validationBody = {
      ...body,

      fields:
        fields ||
        [],
    };

    const validationError =
      validateProductBody(
        validationBody
      );

    if (validationError) {
      return res.status(400).json({
        success: false,

        message:
          validationError,
      });
    }

    const numericPrice =
      Number(
        body.price
      );

    /* -----------------------------------------------------
       UPLOAD NEW IMAGE
    ----------------------------------------------------- */

    if (req.file) {
      newImageUrl =
        await uploadProductImage(
          req.file,
          userId,
          productId
        );
    }

    /* -----------------------------------------------------
       TRANSACTION
    ----------------------------------------------------- */

    const product =
      await prisma.$transaction(
        async (tx) => {
          /* ---------------------------------------------
             DELETE OLD FIELDS
          --------------------------------------------- */

          if (
            Array.isArray(fields)
          ) {
            await tx.productField.deleteMany({
              where: {
                productId,
              },
            });
          }

          /* ---------------------------------------------
             UPDATE PRODUCT
          --------------------------------------------- */

          const updated =
            await tx.product.update({
              where: {
                id:
                  productId,
              },

              data: {
                name:
                  body.name.trim(),

                subtitle:
                  body.subtitle?.trim()
                    ? body.subtitle.trim()
                    : null,

                description:
                  body.description?.trim()
                    ? body.description.trim()
                    : null,

                type:
                  body.type,

                price:
                  numericPrice,

                currency:
                  body.currency,

                /*
                 * Si une nouvelle image existe,
                 * on remplace l'ancienne URL.
                 *
                 * Sinon on conserve l'ancienne.
                 */
                imageUrl:
                  newImageUrl !== null
                    ? newImageUrl
                    : existingProduct.imageUrl,

                status:
                  body.status ||
                  existingProduct.status,

                fields:
                  Array.isArray(fields) &&
                  fields.length > 0
                    ? {
                        create:
                          fields.map(
                            (
                              field
                            ) => ({
                              name:
                                field.name.trim(),

                              label:
                                field.label.trim(),

                              type:
                                field.type,

                              value:
                                field.value?.trim()
                                  ? field.value.trim()
                                  : null,

                              required:
                                Boolean(
                                  field.required
                                ),
                            })
                          ),
                      }
                    : undefined,
              },

              include:
                productInclude,
            });

          return updated;
        }
      );

    /* -----------------------------------------------------
       DELETE OLD IMAGE
    ----------------------------------------------------- */

    /*
     * On ne supprime l'ancienne image qu'après
     * que PostgreSQL ait correctement enregistré
     * la nouvelle URL.
     */
    if (
      newImageUrl &&
      existingProduct.imageUrl &&
      existingProduct.imageUrl !==
        newImageUrl
    ) {
      await deleteSupabaseImage(
        existingProduct.imageUrl
      );
    }

    /* -----------------------------------------------------
       RESPONSE
    ----------------------------------------------------- */

    return res.status(200).json({
      success: true,

      message:
        "Produit mis à jour avec succès.",

      product,
    });
  } catch (error) {
    /*
     * Si une nouvelle image a été uploadée
     * mais que la transaction PostgreSQL échoue,
     * on supprime la nouvelle image pour éviter
     * un fichier orphelin.
     */
    if (
      newImageUrl
    ) {
      await deleteSupabaseImage(
        newImageUrl
      );
    }

    console.error(
      "UPDATE PRODUCT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Impossible de mettre à jour le produit.",
    });
  }
};

/* =========================================================
   DELETE PRODUCT
   DELETE /api/product/:id
========================================================= */

export const deleteProduct = async (
  req: Request,
  res: Response
) => {
  try {
    /* -----------------------------------------------------
       AUTH
    ----------------------------------------------------- */

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Utilisateur non authentifié.",
      });
    }

    /* -----------------------------------------------------
       ID
    ----------------------------------------------------- */

    const productId =
      Number(
        req.params.id
      );

    if (
      !productId ||
      Number.isNaN(productId)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Identifiant du produit invalide.",
      });
    }

    /* -----------------------------------------------------
       CHECK PRODUCT
    ----------------------------------------------------- */

    const product =
      await prisma.product.findFirst({
        where: {
          id:
            productId,

          userId,
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,

        message:
          "Produit introuvable.",
      });
    }

    /* -----------------------------------------------------
       DELETE DATABASE RELATIONS
    ----------------------------------------------------- */

    await prisma.$transaction([
<<<<<<< HEAD
      prisma.productPaymentConfig.deleteMany({
        where: {
          productId,
        },
      }),

      prisma.paymentPageProduct.deleteMany({
        where: {
          productId,
        },
      }),

      prisma.productField.deleteMany({
        where: {
          productId,
        },
      }),

      prisma.product.delete({
        where: {
          id:
            productId,
        },
      }),
    ]);

    /* -----------------------------------------------------
       DELETE SUPABASE IMAGE
    ----------------------------------------------------- */

    if (
      product.imageUrl
    ) {
      await deleteSupabaseImage(
        product.imageUrl
      );
    }
=======
  prisma.productPaymentConfig.deleteMany({
    where:{
      productId
    }
  }),
>>>>>>> 4e6d128294c58300ce75b35e1918f176b5d1b31a

  prisma.paymentPageProduct.deleteMany({
    where:{
      productId
    }
  }),

  prisma.product.delete({
    where:{
      id: productId
    }
  })
]);
    /* -----------------------------------------------------
       RESPONSE
    ----------------------------------------------------- */

    return res.status(200).json({
      success: true,

      message:
        "Produit supprimé avec succès.",
    });
  } catch (error) {
    console.error(
      "DELETE PRODUCT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Impossible de supprimer le produit.",
    });
  }
};

/* =========================================================
   PUBLISH PRODUCT
   PATCH /api/product/:id/publish
========================================================= */

export const publishProduct = async (
  req: Request,
  res: Response
) => {
  try {
    /* -----------------------------------------------------
       AUTH
    ----------------------------------------------------- */

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Utilisateur non authentifié.",
      });
    }

    /* -----------------------------------------------------
       ID
    ----------------------------------------------------- */

    const productId =
      Number(
        req.params.id
      );

    if (
      !productId ||
      Number.isNaN(productId)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Identifiant du produit invalide.",
      });
    }

    /* -----------------------------------------------------
       CHECK OWNERSHIP
    ----------------------------------------------------- */

    const product =
      await prisma.product.findFirst({
        where: {
          id:
            productId,

          userId,
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,

        message:
          "Produit introuvable.",
      });
    }

    /* -----------------------------------------------------
       CHECK IMAGE
    ----------------------------------------------------- */

    /*
     * Un produit publié doit avoir une image
     * si ton interface considère l'image obligatoire.
     *
     * Si l'image n'est PAS obligatoire dans ton projet,
     * supprime simplement cette vérification.
     */
    if (
      !product.imageUrl
    ) {
      return res.status(400).json({
        success: false,

        code:
          "PRODUCT_IMAGE_REQUIRED",

        message:
          "Veuillez ajouter une image au produit avant de le publier.",
      });
    }

    /* -----------------------------------------------------
       CHECK SUBSCRIPTION
    ----------------------------------------------------- */

    try {
      const limit =
        await checkProductLimit(
          userId
        );

      if (
        !limit.allowed
      ) {
        return res.status(403).json({
          success: false,

          code:
            "SUBSCRIPTION_REQUIRED",

          message:
            "Vous devez souscrire à un abonnement pour publier ce produit.",
        });
      }
    } catch (error) {
      console.error(
        "CHECK PRODUCT LIMIT ERROR:",
        error
      );

      return res.status(403).json({
        success: false,

        code:
          "SUBSCRIPTION_REQUIRED",

        message:
          "Vous devez souscrire à un abonnement pour publier ce produit.",
      });
    }

    /* -----------------------------------------------------
       PUBLISH
    ----------------------------------------------------- */

    const updatedProduct =
      await prisma.product.update({
        where: {
          id:
            productId,
        },

        data: {
          status:
            ProductStatus.PUBLISHED,
        },

        include:
          productInclude,
      });

    /* -----------------------------------------------------
       RESPONSE
    ----------------------------------------------------- */

    return res.status(200).json({
      success: true,

      message:
        "Produit publié avec succès.",

      product:
        updatedProduct,
    });
  } catch (error) {
    console.error(
      "PUBLISH PRODUCT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Impossible de publier le produit.",
    });
  }
};
