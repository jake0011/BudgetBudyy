import { Hono } from "hono";
import { sign } from "hono/jwt";
import { eq, or, and } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import { users } from "../db/schema/users.ts";
import { db } from "../db/db";

//TODO: login
//      delete user
//      send email verification after sign up
//      get user by id

const signUpSchema = z.object({
  username: z.string(),
  firstname: z.string(),
  middlename: z.string().optional(),
  lastname: z.string(),
  password: z.string().min(8).max(20),
  email: z.string(),
});

const signInSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  password: z.string(),
});

const user = new Hono().basePath("v1/user");

user.get("/all", async (c) => {
  try {
    const userRows = await db.select().from(users);
    return c.json({ userRows }, 201);
  } catch (err) {
    return c.json({err}, 500);
  }
});

user.post(
  "/signup",
  zValidator("json", signUpSchema, (result, c) => {
    if (!result.success) {
      return c.json("Invalid Input", 415);
    }
  }),
  async (c) => {
    try {
      const body = await c.req.json();

      //TODO: see if you can find a way to use the error rather to get it
      const userExists = await db
        .select()
        .from(users)
        .where(
          or(eq(users.username, body.username), eq(users.email, body.email)),
        );

      if (userExists.length != 0) {
        return c.json("User Already Exists", 409);
      }

      //INFO: for some reason, when you use Argon2id it doesn't work
      const bcryptHash = await Bun.password.hash(body.password, {
        algorithm: "bcrypt",
        cost: 4,
      });

      await db.insert(users).values({
        username: body.username,
        firstname: body.firstname,
        middlename: body.middlename,
        lastname: body.lastname,
        password: bcryptHash,
        email: body.email,
      });
      return c.json("Sign Up successful", 201);
    } catch (error) {
      c.json({error}, 500);
    }
  },
);

user.post(
  "/signin",
  zValidator("json", signInSchema, (result, c) => {
    if (!result.success) {
      return c.json("Invalid Input", 415);
    }
  }),
  async (c) => {
    try {
      const body = await c.req.json();
      //TODO: Flavio should migrate this to the find first api instead
      //https://orm.drizzle.team/docs/rqb#find-first
      const userDetails = await db
        .select()
        .from(users)
        .where(
          or(eq(users.username, body.username), eq(users.email, body.email)),
        )
        .limit(1);

      const isPasswordMatch = await Bun.password.verify(
        body.password,
        userDetails[0].password,
      );

      if (isPasswordMatch) {
        const payload = {
          exp: Math.floor(Date.now() / 1000) + 60 * Number(process.env.JWT_EXPIRY_TIME ?? 48260),
        };
        const secret = process.env.JWT_SECRET_KEY || "mySecretKey";
        const token = await sign(payload, secret);
        c.json(
          {
            token: token,
            data: {
              username: userDetails[0].username,
              firstname: userDetails[0].firstname,
              middlename: userDetails[0].middlename,
              lastname: userDetails[0].lastname,
              email: userDetails[0].email,
            }
          },
          201,
        );
      } else {
        return c.json("Username or Password Wrong", 401);
      }
    } catch (error) {
      c.json({error}, 500);
    }
  },
);
export default user;
