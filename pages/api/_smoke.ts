import type { NextApiRequest, NextApiResponse } from "next";
import { ordersApi, customersApi } from "@/lib/strapiAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const orders = await ordersApi.find();
    const customers = await customersApi.find();
    return res.status(200).json({ ok: true, orders: orders.length, customers: customers.length });
  } catch (err: any) {
    return res.status(500).json({ ok: false, name: err.name, status: err.status, message: err.message });
  }
}