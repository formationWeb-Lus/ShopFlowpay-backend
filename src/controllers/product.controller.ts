
import { Request, Response } from "express";
import {
  ProductType,
  Currency,
  ProductStatus,
  ProductFieldType,
} from "@prisma/client";

import prisma from "../lib/prisma";

import {
 checkProductLimit
} from "../services/subscription.service";

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
  price: number;
  currency: Currency;
  imageUrl?: string | null;
  status?: ProductStatus;
  fields?: ProductFieldInput[];
}

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
   Compatible avec ton schema Prisma
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
    (typeof name !== "string" || !name.trim())
  ) {
    return "Le nom du produit est obligatoire.";
  }

  /* -------------------------------------------------------
     PRICE
  ------------------------------------------------------- */

  const numericPrice = Number(price);

  if (
    Number.isNaN(numericPrice) ||
    numericPrice < 0
  ) {
    return "Le prix du produit est invalide.";
  }

  /* -------------------------------------------------------
     TYPE
  ------------------------------------------------------- */

  if (
    !Object.values(ProductType).includes(type)
  ) {
    return "Le type de produit est invalide.";
  }

  /* -------------------------------------------------------
     CURRENCY
  ------------------------------------------------------- */

  if (
    !Object.values(Currency).includes(currency)
  ) {
    return "La devise est invalide.";
  }

  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  if (
    status &&
    !Object.values(ProductStatus).includes(status)
  ) {
    return "Le statut du produit est invalide.";
  }

  /* -------------------------------------------------------
     FIELDS
  ------------------------------------------------------- */

  if (!Array.isArray(fields)) {
    return "Le format des champs personnalisés est invalide.";
  }

  const fieldNames = new Set<string>();

  for (
    let index = 0;
    index < fields.length;
    index++
  ) {
    const field = fields[index];

    if (
      !field ||
      typeof field !== "object"
    ) {
      return `Le champ ${index + 1} est invalide.`;
    }

    /* -----------------------------------------------------
       FIELD NAME
    ----------------------------------------------------- */

    if (
      typeof field.name !== "string" ||
      !field.name.trim()
    ) {
      return `Le nom technique du champ ${index + 1} est obligatoire.`;
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
      return `Le libellé du champ ${index + 1} est obligatoire.`;
    }

    /* -----------------------------------------------------
       UNIQUE NAME
    ----------------------------------------------------- */

    if (fieldNames.has(fieldName)) {
      return `Le nom technique "${fieldName}" est utilisé plusieurs fois.`;
    }

    fieldNames.add(fieldName);

    /* -----------------------------------------------------
       FIELD TYPE
    ----------------------------------------------------- */

    if (
      !Object.values(ProductFieldType).includes(
        field.type
      )
    ) {
      return `Le type du champ "${fieldName}" est invalide.`;
    }
  }

  return null;
}

/* =========================================================
   CREATE PRODUCT
   POST /api/product
========================================================= */

export const createProduct = async (
  req: Request,
  res: Response
) => {
  try {
    /* -----------------------------------------------------
       AUTH
    ----------------------------------------------------- */

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }


    /* -----------------------------------------------------
       BODY
    ----------------------------------------------------- */

    const body =
      req.body as CreateProductBody;

    const {
      name,
      subtitle,
      description,
      type,
      price,
      currency,
      imageUrl,
      status,
      fields = [],
    } = body;

    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    const validationError =
      validateProductBody(body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const numericPrice =
      Number(price);

    const productStatus =
      status || ProductStatus.DRAFT;

    /* -----------------------------------------------------
       CREATE
    ----------------------------------------------------- */

   /* -----------------------------------------------------
   CHECK PRODUCT LIMIT
----------------------------------------------------- */





    const product =
      await prisma.product.create({
        data: {
          userId,

          name: name.trim(),

          subtitle:
            subtitle?.trim()
              ? subtitle.trim()
              : null,

          description:
            description?.trim()
              ? description.trim()
              : null,

          type,

          price: numericPrice,

          currency,

          imageUrl:
            imageUrl?.trim()
              ? imageUrl.trim()
              : null,

          status: productStatus,

          /* ---------------------------------------------
             CUSTOM FIELDS
          --------------------------------------------- */

          fields:
            fields.length > 0
              ? {
                  create: fields.map(
                    (field) => ({
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

        include: productInclude,
      });

    /* -----------------------------------------------------
       RESPONSE
    ----------------------------------------------------- */

    return res.status(201).json({
      success: true,
      message:
        "Produit créé avec succès.",
      product,
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

    const userId = getUserId(req);

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

        include: productInclude,

        orderBy: {
          createdAt: "desc",
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

    const userId = getUserId(req);

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
      Number(req.params.id);

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
          id: productId,
          userId,
        },

        include: productInclude,
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
  req: Request,
  res: Response
) => {
  try {
    /* -----------------------------------------------------
       AUTH
    ----------------------------------------------------- */

    const userId = getUserId(req);

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
      Number(req.params.id);

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
          id: productId,
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

    const body =
      req.body as CreateProductBody;

    const {
      name,
      subtitle,
      description,
      type,
      price,
      currency,
      imageUrl,
      status,
      fields,
    } = body;

    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    const validationError =
      validateProductBody(body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const numericPrice =
      Number(price);

    /* -----------------------------------------------------
       TRANSACTION
    ----------------------------------------------------- */

    const product =
      await prisma.$transaction(
        async (tx) => {
          /* ---------------------------------------------
             DELETE OLD FIELDS
          --------------------------------------------- */

          if (Array.isArray(fields)) {
            await tx.productField.deleteMany({
              where: {
                productId,
              },
            });
          }

          /* ---------------------------------------------
             UPDATE PRODUCT
          --------------------------------------------- */

          return tx.product.update({
            where: {
              id: productId,
            },

            data: {
              name:
                name.trim(),

              subtitle:
                subtitle?.trim()
                  ? subtitle.trim()
                  : null,

              description:
                description?.trim()
                  ? description.trim()
                  : null,

              type,

              price:
                numericPrice,

              currency,

              imageUrl:
                imageUrl?.trim()
                  ? imageUrl.trim()
                  : null,

              status:
                status ||
                ProductStatus.DRAFT,

              /* -----------------------------------------
                 NEW FIELDS
              ----------------------------------------- */

              fields:
                Array.isArray(fields) &&
                fields.length > 0
                  ? {
                      create:
                        fields.map(
                          (field) => ({
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
        }
      );

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

    const userId = getUserId(req);

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
      Number(req.params.id);

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
          id: productId,
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
       DELETE
    ----------------------------------------------------- */

    await prisma.product.delete({
      where: {
        id: productId,
      },
    });

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

    const userId = getUserId(req);

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
      Number(req.params.id);

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
          id: productId,
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
   CHECK SUBSCRIPTION
----------------------------------------------------- */

try {

  const limit = await checkProductLimit(userId);

  if (!limit.allowed) {
    return res.status(403).json({
      success: false,
      code: "SUBSCRIPTION_REQUIRED",
      message:
        "Vous devez souscrire à un abonnement pour publier ce produit.",
    });
  }

} catch {

  return res.status(403).json({
    success: false,
    code: "SUBSCRIPTION_REQUIRED",
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
          id: productId,
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
