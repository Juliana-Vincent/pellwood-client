import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/user.model";
import { hashPassword, createSessionToken, buildSessionCookie } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";

// Only these fields may ever be updated via PUT type=update - never _id, password
// (handled separately below), resetTokenHash/resetTokenExpires, or anything else a
// client might slip into the body.
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  if (!["POST", "PUT"].includes(method as string)) {
    res.setHeader("Allow", ["POST", "PUT"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  await dbConnect();

  try {
    if (method === "POST") {
      const { email, password } = req.body;

      if (!email?.length || !password?.length) {
        return res.status(400).json({
          msg: "Empty input",
          error: [!email?.length && "email", !password?.length && "password"].filter(Boolean),
        });
      }

      const existUser = await User.findOne({ email });

      if (existUser) {
        return res.status(409).json({
          msg: "User now exist",
          error: "email",
        });
      }

      const userData = await User.create({
        _id: new mongoose.Types.ObjectId(),
        email,
        password: await hashPassword(password),
      });
      const { password: _pw, resetTokenHash, resetTokenExpires, ...safeUser } = userData.toObject();
      res.setHeader("Set-Cookie", buildSessionCookie(createSessionToken(String(userData._id))));
      return res.status(201).json({
        msg: "User successfully created",
        data: safeUser,
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

        const update: Record<string, any> = {};
        for (const field of UPDATABLE_FIELDS) {
          if (data?.[field] !== undefined) update[field] = data[field];
        }
        if (data?.password) {
          update.password = await hashPassword(data.password);
        }

        await User.updateOne({ _id: sessionUser._id }, update);
        userData = await User.findById(sessionUser._id);
      } else if (type === "create") {
        if (!data?.email?.length || !data?.password?.length) {
          return res.status(400).json({
            msg: "Empty input",
            error: [!data?.email?.length && "email", !data?.password?.length && "password"].filter(Boolean),
          });
        }
        const existUser = await User.findOne({ email: data.email });
        if (existUser) {
          return res.status(409).json({ msg: "User now exist", error: "email" });
        }
        userData = await User.create({
          ...data,
          _id: new mongoose.Types.ObjectId(),
          password: await hashPassword(data.password),
        });
        res.setHeader("Set-Cookie", buildSessionCookie(createSessionToken(String(userData._id))));
      }

      if (!userData) {
        return res.status(400).json({ msg: "Invalid request" });
      }

      const { password: _pw, resetTokenHash, resetTokenExpires, ...safeUser } = userData.toObject();
      return res.status(200).json({
        msg: "User successfully processed",
        data: safeUser,
      });
    }
  } catch (err) {
    console.error(`user.${method?.toLowerCase() || "action"} error:`, err);
    return res.status(500).json({
      msg: "Internal Server Error", // real error is already logged server-side above
    });
  }
}
