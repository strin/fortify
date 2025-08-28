import prisma from "@/lib/prisma";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password, display_name, username } = await req.json();
  let exists: any = await prisma.$queryRaw`
    SELECT * FROM "Creator"
    WHERE "username" = ${username} OR "email" = ${email}
  `;

  if (exists.length) {
    return NextResponse.json(
      { error: "User name or email already exists" },
      { status: 400 }
    );
  }

  let emailExists = await prisma.creator.findUnique({
    where: {
      email,
    },
  });

  if (emailExists) {
    return NextResponse.json(
      { error: "Email already exists" },
      { status: 400 }
    );
  }

  // create user.
  const payload: any = {};
  if (password !== undefined) payload.password = await hash(password, 10);
  if (display_name !== undefined) payload.display_name = display_name;
  if (username !== undefined) payload.username = username;
  if (email !== undefined) payload.email = email;

  const user = await prisma.creator.create({
    data: payload,
  });

  console.log("User created", user);

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const { display_name, bioDescription, username, isProfileComplete } =
    await req.json();

  let exists = await prisma.creator.findUnique({
    where: {
      username,
    },
  });
  if (!exists) {
    return NextResponse.json({ error: "User does not exist" }, { status: 400 });
  }

  // update user
  const user = await prisma.creator.update({
    where: {
      username,
    },
    data: {
      display_name,
      bioDescription,
      isProfileComplete,
    },
  });

  console.log("User updated", user);
  return NextResponse.json({
    data: user,
    status: true,
  });
}
