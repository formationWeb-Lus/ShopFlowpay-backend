
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


// =====================================================
// TYPE DU PAYLOAD JWT
// =====================================================

export interface AuthRequest extends Request {

    user?: {
        id: number;
        email: string;
        role: string;
    };

}


// =====================================================
// MIDDLEWARE AUTHENTIFICATION
// =====================================================

export function authenticateToken(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {

    try {

        // -------------------------------------------------
        // RECUPERER LE HEADER AUTHORIZATION
        // -------------------------------------------------

        const authHeader =
            req.headers.authorization;


        if (!authHeader) {

            return res.status(401).json({

                message:
                    "Token d'authentification manquant",

            });

        }


        // -------------------------------------------------
        // FORMAT ATTENDU
        //
        // Authorization: Bearer TOKEN
        // -------------------------------------------------

        const parts =
            authHeader.split(" ");


        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer"
        ) {

            return res.status(401).json({

                message:
                    "Format du token invalide",

            });

        }


        const token =
            parts[1];


        // -------------------------------------------------
        // JWT SECRET
        // -------------------------------------------------

        const secret =
            process.env.JWT_SECRET;


        if (!secret) {

            console.error(
                "JWT_SECRET est manquant dans .env"
            );


            return res.status(500).json({

                message:
                    "Configuration serveur incorrecte",

            });

        }


        // -------------------------------------------------
        // VERIFIER LE TOKEN
        // -------------------------------------------------

        const decoded =
            jwt.verify(
                token,
                secret
            ) as {
                id: number;
                email: string;
                role: string;
            };


        // -------------------------------------------------
        // VERIFIER LE PAYLOAD
        // -------------------------------------------------

        if (
            !decoded ||
            !decoded.id ||
            !decoded.email
        ) {

            return res.status(401).json({

                message:
                    "Token invalide",

            });

        }


        // -------------------------------------------------
        // AJOUTER USER A LA REQUEST
        // -------------------------------------------------

        req.user = {

            id: decoded.id,

            email: decoded.email,

            role: decoded.role,

        };


        // -------------------------------------------------
        // CONTINUER
        // -------------------------------------------------

        next();


    } catch (error) {

        console.error(
            "AUTH MIDDLEWARE ERROR:",
            error
        );


        return res.status(401).json({

            message:
                "Token invalide ou expiré",

        });

    }

}
