import {
  setServerSession,
  NotAuthenticatedError,
} from "../../helpers/getSetServerSession";
import { User } from "../../helpers/User";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { db } from "../../helpers/db";

export async function handle(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);

    // Query penalty information for the user
    const userWithPenalty = await db
      .selectFrom("users")
      .select(["penaltyUntil", "penaltyCount"])
      .where("id", "=", user.id)
      .executeTakeFirst();

    // Create response with user data including penalty info
    const response = Response.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        penaltyUntil: userWithPenalty?.penaltyUntil ?? null,
        penaltyCount: userWithPenalty?.penaltyCount ?? 0,
      } satisfies User,
    });

    // Update the session cookie with the new lastAccessed time
    await setServerSession(response, {
      id: session.id,
      createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime(),
    });

    return response;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Session validation error:", error);
    return Response.json(
      { error: "Session validation failed" },
      { status: 400 }
    );
  }
}
