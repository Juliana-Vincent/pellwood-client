import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/user.model";
import { hashPassword } from "@/lib/auth";

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
        return res.status(201).json({
          msg: "Empty input",
          error: [!email?.length && "email", !password?.length && "password"].filter(Boolean),
        });
      }

      const existUser = await User.findOne({ email });

      if (existUser) {
        return res.status(201).json({
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
      return res.status(201).json({
        msg: "User successfully created",
        data: safeUser,
      });
    }

    if (method === "PUT") {
      const { data, type } = req.body;
      let userData;

      if (type === "update") {
        const id = data.id;
        const update = { ...data };
        if (update.password) {
          update.password = await hashPassword(update.password);
        } else {
          delete update.password;
        }
        await User.findOneAndUpdate({ _id: id }, update);
        userData = await User.findById(id);
      } else if (type === "create") {
        if (!data?.email?.length || !data?.password?.length) {
          return res.status(201).json({
            msg: "Empty input",
            error: [!data?.email?.length && "email", !data?.password?.length && "password"].filter(Boolean),
          });
        }
        const existUser = await User.findOne({ email: data.email });
        if (existUser) {
          return res.status(201).json({ msg: "User now exist", error: "email" });
        }
        userData = await User.create({
          ...data,
          _id: new mongoose.Types.ObjectId(),
          password: await hashPassword(data.password),
        });
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
      msg: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
}
