import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      )
    }

    // TODO: Check if user already exists in database
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // TODO: Save user to database
    const user = {
      id: "1",
      email,
      name,
      password: hashedPassword,
    }

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    )
  }
}