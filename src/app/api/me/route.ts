import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { publicUser } from "@/lib/serialize";
import { audit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "No session.");
  return ok({ user: publicUser(user) });
}

const Patch = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20)
    .regex(/^[A-Za-z0-9_\-]+$/, "Letters, numbers, _ and - only"),
});

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail(401, "UNAUTHORIZED", "No session.");
  let username: string;
  try {
    username = Patch.parse(await req.json()).username;
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.errors[0]?.message : "Invalid username.";
    return fail(400, "BAD_INPUT", msg || "Invalid username.");
  }
  const taken = await db.user.findUnique({ where: { username } });
  if (taken && taken.id !== user.id) return fail(409, "USERNAME_TAKEN", "That username is taken.");
  const updated = await db.user.update({ where: { id: user.id }, data: { username } });
  await audit("PROFILE_UPDATED", { actorId: user.id, meta: { username } });
  return ok({ user: publicUser(updated) });
}
