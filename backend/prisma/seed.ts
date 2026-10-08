import prisma from "../src/lib/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { phone: "+10000000000" },
    update: {},
    create: {
      phone: "+10000000000",
      email: "admin@noris.app",
      username: "admin",
      passwordHash: adminPassword,
      phoneVerified: true,
      emailVerified: true,
      role: "ADMIN",
      profile: { create: { displayName: "Noris Admin", bio: "System administrator" } },
      settings: { create: {} },
    },
  });

  // Create demo user
  const userPassword = await bcrypt.hash("demo123", 10);
  const demoUser = await prisma.user.upsert({
    where: { phone: "+10000000001" },
    update: {},
    create: {
      phone: "+10000000001",
      email: "demo@noris.app",
      username: "demo",
      passwordHash: userPassword,
      phoneVerified: true,
      emailVerified: true,
      profile: { create: { displayName: "Demo User", bio: "Hello! I'm using Noris." } },
      settings: { create: {} },
    },
  });

  // Create a second demo user
  const demo2 = await prisma.user.upsert({
    where: { phone: "+10000000002" },
    update: {},
    create: {
      phone: "+10000000002",
      email: "alice@noris.app",
      username: "alice",
      passwordHash: userPassword,
      phoneVerified: true,
      emailVerified: true,
      profile: { create: { displayName: "Alice", bio: "Design enthusiast" } },
      settings: { create: {} },
    },
  });

  // Create a third demo user
  const demo3 = await prisma.user.upsert({
    where: { phone: "+10000000003" },
    update: {},
    create: {
      phone: "+10000000003",
      email: "bob@noris.app",
      username: "bob",
      passwordHash: userPassword,
      phoneVerified: true,
      emailVerified: true,
      profile: { create: { displayName: "Bob", bio: "Coffee lover" } },
      settings: { create: {} },
    },
  });

  // Add contacts
  await prisma.contact.upsert({
    where: { ownerId_targetId: { ownerId: demoUser.id, targetId: demo2.id } },
    update: {},
    create: { ownerId: demoUser.id, targetId: demo2.id },
  });
  await prisma.contact.upsert({
    where: { ownerId_targetId: { ownerId: demoUser.id, targetId: demo3.id } },
    update: {},
    create: { ownerId: demoUser.id, targetId: demo3.id },
  });

  // Create a direct conversation between demo and alice
  const conv = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      createdBy: demoUser.id,
      members: {
        create: [
          { userId: demoUser.id, role: "MEMBER" },
          { userId: demo2.id, role: "MEMBER" },
        ],
      },
    },
  });

  // Add some messages
  await prisma.message.createMany({
    data: [
      { conversationId: conv.id, senderId: demo2.id, text: "Hey! Welcome to Noris 👋", type: "TEXT" },
      { conversationId: conv.id, senderId: demoUser.id, text: "Hi Alice! This looks great!", type: "TEXT" },
      { conversationId: conv.id, senderId: demo2.id, text: "Let's test some features 🎉", type: "TEXT" },
    ],
  });

  console.log("✅ Seed complete!");
  console.log("  Admin login: admin@noris.app / admin123");
  console.log("  Demo login: demo@noris.app / demo123");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
