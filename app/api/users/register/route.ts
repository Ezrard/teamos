import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateId } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides. Vérifiez les champs." }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const parts = name.trim().split(" ");
  const firstName = parts[0] ?? name;
  const lastName = parts.slice(1).join(" ") || firstName;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Un compte avec cet email existe déjà" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({
      id: generateId(),
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      password: hashedPassword,
    })
    .returning();

  return NextResponse.json(
    { user: { id: user.id, email: user.email, name: user.name } },
    { status: 201 }
  );
}
