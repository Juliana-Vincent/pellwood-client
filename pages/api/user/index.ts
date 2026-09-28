import type { NextApiRequest, NextApiResponse } from "next";
import { customersApi, serializeCustomer, StrapiError } from "@/lib/strapiAdmin";
import { hashPassword, createSessionToken, buildSessionCookie } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";

// Only these fields may ever be set or updated from a request body - never
// password (handled separately below), resetTokenHash/resetTokenExpires, or
// anything else a client might slip in.
const UPDATABLE_FIELDS = [
  "phone",
  "name",
  "surname",
  "country",
  "city",
  "address",
  "code",
  "anotherAdress",
  "companyData",
] as const;

const JSON_FIELDS = new Set(["anotherAdress", "companyData"]);

function pickWritableFields(data: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const field of UPDATABLE_FIELDS) {
    if (data?.[field] === undefined) continue;
    const value = data[field];
    out[field] = value === null && JSON_FIELDS.has(field) ? {} : value;
  }
  return out;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  if (!["POST", "PUT"].includes(method as string)) {
    res.setHeader("Allow", ["POST", "PUT"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    if (method === "POST") {
      const { email, password } = req.body;

      if (!email?.length || !password?.length) {
        return res.status(400).json({
          msg: "Empty input",
          error: [!email?.length && "email", !password?.length && "password"].filter(Boolean),
        });
      }

      const existUser = await customersApi.findFirst({ "filters[email][$eq]": email });

      if (existUser) {
        return res.status(409).json({ msg: "User now exist", error: "email" });
      }

      const userData = await customersApi.create({
        email,
        password: await hashPassword(password),
      });
      res.setHeader("Set-Cookie", buildSessionCookie(createSessionToken(userData.documentId)));
      return res.status(201).json({
        msg: "User successfully created",
        data: serializeCustomer(userData),
      });
    }

    if (method === "PUT") {
      const { data, type } = req.body;
      let userData;

      if (type === "update") {
        // The record to update is always the session's own user - never a client-
        // supplied id - otherwise any authenticated user could overwrite anyone
        // else's account by passing a different id.
        const sessionUser = await getSessionUser(req);
        if (!sessionUser) {
          return res.status(401).json({ msg: "Not authenticated" });
        }

        const update = pickWritableFields(data);
        if (data?.password) {
          update.password = await hashPassword(data.password);
        }

        userData = await customersApi.update(sessionUser.documentId, update);
      } else if (type === "create") {
        if (!data?.email?.length || !data?.password?.length) {
          return res.status(400).json({
            msg: "Empty input",
            error: [!data?.email?.length && "email", !data?.password?.length && "password"].filter(Boolean),
          });
        }
        const existUser = await customersApi.findFirst({ "filters[email][$eq]": data.email });
        if (existUser) {
          return res.status(409).json({ msg: "User now exist", error: "email" });
        }
        // Whitelisted, not spread: `...data` let a client set any field the schema
        // happened to define, including resetTokenHash.
        userData = await customersApi.create({
          ...pickWritableFields(data),
          email: data.email,
          password: await hashPassword(data.password),
        });
        res.setHeader("Set-Cookie", buildSessionCookie(createSessionToken(userData.documentId)));
      }

      if (!userData) {
        return res.status(400).json({ msg: "Invalid request" });
      }

      return res.status(200).json({
        msg: "User successfully processed",
        data: serializeCustomer(userData),
      });
    }
  } catch (err: any) {
    // Two simultaneous signups with the same address both pass the lookup and race
    // to insert; the unique constraint on email is what actually stops the
    // duplicate, so surface it as the same 409 rather than a 500.
    if (err instanceof StrapiError && err.status === 400) {
      if (/unique|already exists/i.test(err.message)) {
        return res.status(409).json({ msg: "User now exist", error: "email" });
      }
      console.error(`user.${method?.toLowerCase()} validation error:`, err.message);
      return res.status(400).json({ msg: "Invalid request" });
    }
    console.error(`user.${method?.toLowerCase() || "action"} error:`, err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
}