import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Single-user app: refuse to create an account for anyone but the owner.
        before: async (user) => {
          if (user.email !== process.env.ALLOWED_USER_EMAIL) {
            throw new APIError("FORBIDDEN", { message: "This is a private app." });
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
