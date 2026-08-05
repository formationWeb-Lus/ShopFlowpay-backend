import prisma from "../src/lib/prisma";

async function main() {
  console.log("Création des plans...");

  await prisma.plan.upsert({
    where: {
      id: 1,
    },
    update: {
      name: "Starter",
      description: "Pour les entrepreneurs qui commencent.",
      priceUSD: 5,
      priceCDF: 11150,
      maxProducts: 5,
      features: [
        "5 produits maximum",
        "Pages de paiement simples",
        "Suivi des transactions",
        "Support standard",
      ],
    },
    create: {
      id: 1,
      name: "Starter",
      description: "Pour les entrepreneurs qui commencent.",
      priceUSD: 5,
      priceCDF: 11150,
      maxProducts: 5,
      features: [
        "5 produits maximum",
        "Pages de paiement simples",
        "Suivi des transactions",
        "Support standard",
      ],
    },
  });

  await prisma.plan.upsert({
    where: {
      id: 2,
    },
    update: {
      name: "Business",
      description: "Pour les entreprises en croissance.",
      priceUSD: 10,
      priceCDF: 22300,
      maxProducts: null,
      features: [
        "Produits illimités",
        "Pages de paiement avancées",
        "Statistiques complètes",
        "Support prioritaire",
      ],
    },
    create: {
      id: 2,
      name: "Business",
      description: "Pour les entreprises en croissance.",
      priceUSD: 10,
      priceCDF: 22300,
      maxProducts: null,
      features: [
        "Produits illimités",
        "Pages de paiement avancées",
        "Statistiques complètes",
        "Support prioritaire",
      ],
    },
  });

  await prisma.plan.upsert({
    where: {
      id: 3,
    },
    update: {
      name: "Premium",
      description: "Pour les grandes entreprises.",
      priceUSD: 25,
      priceCDF: 55750,
      maxProducts: null,
      features: [
        "Toutes les fonctionnalités",
        "Multi-utilisateurs",
        "API paiement",
        "Support VIP",
      ],
    },
    create: {
      id: 3,
      name: "Premium",
      description: "Pour les grandes entreprises.",
      priceUSD: 25,
      priceCDF: 55750,
      maxProducts: null,
      features: [
        "Toutes les fonctionnalités",
        "Multi-utilisateurs",
        "API paiement",
        "Support VIP",
      ],
    },
  });

  console.log("Plans créés avec succès !");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });