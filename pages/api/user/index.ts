import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { hashPassword, createSessionToken, buildSessionCookie } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";

const UPDATABLE_FIELDS = [
  "phone",
  "name",
  "surname",
  "country",
  "city",
  "address",
  "code",
  "anotherAddressCheck",
  "companyDataCheck",
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

function toSafeUser(user: Record<string, any>) {
  const { password: _pw, resetTokenHash, resetTokenExpires, ...safeUser } = user;
  return safeUser;
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

      const existUser = await prisma.user.findUnique({ where: { email } });

      if (existUser) {
        return res.status(409).json({
          msg: "User now exist",
          error: "email",
        });
      }

      const userData = await prisma.user.create({
        data: {
          email,
          password: await hashPassword(password),
        },
      });
      res.setHeader("Set-Cookie", buildSessionCookie(createSessionToken(userData.id)));
      return res.status(201).json({
        msg: "User successfully created",
        data: toSafeUser(userData),
      });
    }

    if (method === "PUT") {
      const { data, type } = req.body;
      let userData;

      if (type === "update") {
        const sessionUser = await getSessionUser(req);
        if (!sessionUser) {
          return res.status(401).json({ msg: "Not authenticated" });
        }

        const update = pickWritableFields(data);
        if (data?.password) {
          update.password = await hashPassword(data.password);
        }

        userData = await prisma.user.update({
          where: { id: sessionUser.id },
          data: update,
        });
      } else if (type === "create") {
        if (!data?.email?.length || !data?.password?.length) {
          return res.status(400).json({
            msg: "Empty input",
            error: [!data?.email?.length && "email", !data?.password?.length && "password"].filter(Boolean),
          });
        }
        const existUser = await prisma.user.findUnique({ where: { email: data.email } });
        if (existUser) {
          return res.status(409).json({ msg: "User now exist", error: "email" });
        }
        userData = await prisma.user.create({
          data: {
            ...pickWritableFields(data),
            email: data.email,
            password: await hashPassword(data.password),
          },
        });
        res.setHeader("Set-Cookie", buildSessionCookie(createSessionToken(userData.id)));
      }

      if (!userData) {
        return res.status(400).json({ msg: "Invalid request" });
      }

      return res.status(200).json({
        msg: "User successfully processed",
        data: toSafeUser(userData),
      });
    }
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ msg: "User now exist", error: "email" });
    }
    console.error(`user.${method?.toLowerCase() || "action"} error:`, err);
    return res.status(500).json({
      msg: "Internal Server Error", 
    });
  }
}