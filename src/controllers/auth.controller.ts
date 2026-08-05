
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

/**
 * =========================================================
 * GENERATE UNIQUE COMPANY SLUG
 * =========================================================
 */

const generateCompanySlug = async (name: string) => {
    const baseSlug =
        name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") ||
        "entreprise";

    let slug = baseSlug;
    let counter = 1;

    while (
        await prisma.company.findUnique({
            where: {
                slug,
            },
        })
    ) {
        counter++;
        slug = `${baseSlug}-${counter}`;
    }

    return slug;
};


/**
 * =========================================================
 * GENERATE UNIQUE USER PUBLIC SLUG
 * =========================================================
 *
 * Ce slug sera utilisé pour la boutique publique :
 *
 * /p/coderise-solution
 *
 * Chaque entrepreneur possède son propre lien public.
 *
 * Exemple :
 *
 * User 1 → /p/coderise-solution
 * User 2 → /p/mon-entreprise
 * User 3 → /p/boutique-jean-2
 *
 * =========================================================
 */

const generateUserSlug = async (name: string) => {

    const baseSlug =
        name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") ||
        "entrepreneur";

    let slug = baseSlug;
    let counter = 1;

    while (
        await prisma.user.findUnique({
            where: {
                slug,
            },
        })
    ) {
        counter++;

        slug =
            `${baseSlug}-${counter}`;
    }

    return slug;
};


/**
 * =========================================================
 * REGISTER
 * =========================================================
 */

export async function register(
    req: Request,
    res: Response
) {
    try {

        const {
            fullName,
            companyName,
            email,
            phone,
            password,
        } = req.body;


        /**
         * -------------------------------------------------
         * VALIDATION
         * -------------------------------------------------
         */

        if (
            !fullName ||
            !companyName ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Veuillez remplir tous les champs obligatoires.",
            });
        }


        /**
         * -------------------------------------------------
         * NORMALISER EMAIL
         * -------------------------------------------------
         */

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();


        /**
         * -------------------------------------------------
         * VERIFIER SI L'EMAIL EXISTE
         * -------------------------------------------------
         */

        const existUser =
            await prisma.user.findUnique({
                where: {
                    email:
                        normalizedEmail,
                },
            });


        if (existUser) {
            return res.status(400).json({
                success: false,
                message:
                    "Email déjà utilisé.",
            });
        }


        /**
         * -------------------------------------------------
         * GENERER SLUG ENTREPRISE
         * -------------------------------------------------
         */

        const companySlug =
            await generateCompanySlug(
                companyName
            );


        /**
         * -------------------------------------------------
         * GENERER SLUG PUBLIC UTILISATEUR
         * -------------------------------------------------
         */

        const userSlug =
            await generateUserSlug(
                companyName
            );


        /**
         * -------------------------------------------------
         * HASH PASSWORD
         * -------------------------------------------------
         */

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        /**
         * -------------------------------------------------
         * CREER UTILISATEUR + ENTREPRISE
         * -------------------------------------------------
         */

        const user =
            await prisma.user.create({

                data: {

                    /**
                     * Informations utilisateur
                     */

                    name:
                        String(fullName).trim(),

                    slug:
                        userSlug,

                    email:
                        normalizedEmail,

                    phone:
                        phone
                            ? String(phone).trim()
                            : null,

                    password:
                        hashedPassword,

                    role:
                        "USER",

                    subscriptionStatus:
                        "FREE",


                    /**
                     * Entreprise
                     */

                    company: {

                        create: {

                            name:
                                String(companyName).trim(),

                            slug:
                                companySlug,

                        },

                    },

                },


                /**
                 * Retourner l'entreprise
                 */

                include: {

                    company:
                        true,

                },

            });


        /**
         * -------------------------------------------------
         * REPONSE
         * -------------------------------------------------
         */

        return res.status(201).json({

            success: true,

            message:
                "Compte créé avec succès.",

            user: {

                id:
                    user.id,

                name:
                    user.name,

                slug:
                    user.slug,

                email:
                    user.email,

                phone:
                    user.phone,

                role:
                    user.role,

                subscriptionStatus:
                    user.subscriptionStatus,

                company:
                    user.company,

            },

        });


    } catch (error: any) {

        console.error(
            "REGISTER ERROR:",
            error
        );


        /**
         * Gestion d'une éventuelle
         * collision de slug
         */

        if (
            error?.code ===
            "P2002"
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "Un compte ou une entreprise avec ces informations existe déjà.",

            });

        }


        return res.status(500).json({

            success: false,

            message:
                "Erreur serveur.",

        });

    }
}


/**
 * =========================================================
 * LOGIN
 * =========================================================
 */

export async function login(
    req: Request,
    res: Response
) {
    try {

        const {
            email,
            password,
        } = req.body;


        /**
         * -------------------------------------------------
         * VALIDATION
         * -------------------------------------------------
         */

        if (
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email et mot de passe obligatoires.",

            });

        }


        /**
         * -------------------------------------------------
         * NORMALISER EMAIL
         * -------------------------------------------------
         */

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();


        /**
         * -------------------------------------------------
         * RECHERCHER UTILISATEUR
         * -------------------------------------------------
         */

        const user =
            await prisma.user.findUnique({

                where: {

                    email:
                        normalizedEmail,

                },

                include: {

                    company:
                        true,

                },

            });


        /**
         * -------------------------------------------------
         * UTILISATEUR INTROUVABLE
         * -------------------------------------------------
         */

        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Email ou mot de passe incorrect.",

            });

        }


        /**
         * -------------------------------------------------
         * VERIFIER PASSWORD
         * -------------------------------------------------
         */

        const passwordValid =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordValid) {

            return res.status(401).json({

                success: false,

                message:
                    "Email ou mot de passe incorrect.",

            });

        }


        /**
         * -------------------------------------------------
         * JWT SECRET
         * -------------------------------------------------
         */

        const jwtSecret =
            process.env.JWT_SECRET;


        if (!jwtSecret) {

            console.error(
                "JWT_SECRET est manquant dans .env"
            );

            return res.status(500).json({

                success: false,

                message:
                    "Configuration serveur incorrecte.",

            });

        }


        /**
         * -------------------------------------------------
         * CREER TOKEN
         * -------------------------------------------------
         */

        const token =
            jwt.sign(

                {

                    id:
                        user.id,

                    email:
                        user.email,

                    role:
                        user.role,

                },

                jwtSecret,

                {

                    expiresIn:
                        "7d",

                }

            );


        /**
         * -------------------------------------------------
         * REPONSE
         * -------------------------------------------------
         */

        return res.status(200).json({

            success: true,

            message:
                "Connexion réussie.",

            token,

            user: {

                id:
                    user.id,

                name:
                    user.name,

                slug:
                    user.slug,

                email:
                    user.email,

                phone:
                    user.phone,

                role:
                    user.role,

                subscriptionStatus:
                    user.subscriptionStatus,

                company:
                    user.company,

            },

        });


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Erreur serveur.",

        });

    }
}


/**
 * =========================================================
 * GET CURRENT USER
 * =========================================================
 *
 * GET /api/auth/me
 *
 * Le middleware authenticateToken doit avoir
 * préalablement vérifié le JWT et placé :
 *
 * req.user.id
 *
 * dans la requête.
 *
 * =========================================================
 */

export async function getMe(
    req: Request,
    res: Response
) {
    try {

        /**
         * -------------------------------------------------
         * RECUPERER USER ID DEPUIS LE TOKEN
         * -------------------------------------------------
         */

        const userId =
            (req as any).user?.id;


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Utilisateur non authentifié.",

            });

        }


        /**
         * -------------------------------------------------
         * RECHERCHER USER
         * -------------------------------------------------
         */

        const user =
            await prisma.user.findUnique({

                where: {

                    id:
                        Number(userId),

                },

                include: {

                    company:
                        true,

                },

            });


        /**
         * -------------------------------------------------
         * USER INTROUVABLE
         * -------------------------------------------------
         */

        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "Utilisateur introuvable.",

            });

        }


        /**
         * -------------------------------------------------
         * REPONSE
         * -------------------------------------------------
         */

        return res.status(200).json({

            success: true,

            user: {

                id:
                    user.id,

                name:
                    user.name,

                slug:
                    user.slug,

                email:
                    user.email,

                phone:
                    user.phone,

                role:
                    user.role,

                subscriptionStatus:
                    user.subscriptionStatus,

                company:
                    user.company,

            },

        });


    } catch (error) {

        console.error(
            "GET ME ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Erreur serveur.",

        });

    }
}
