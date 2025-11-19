// Backend/route/payment.route.js
import express from "express";
import {
  createOrder,
  getAllOrders,
  getOrder,
  confirmOrder,
  updateOrderStatus
} from "../controller/payment.controller.js";

const router = express.Router();

// Customer Routes
router.post("/", createOrder);                    // POST /api/payment - Create new order
router.get("/order/:orderId", getOrder);         // GET /api/payment/order/:id - Get single order

// Admin Routes (TODO: Add authentication middleware)
router.get("/orders", getAllOrders);              // GET /api/payment/orders - Get all orders
router.put("/confirm/:orderId", confirmOrder);    // PUT /api/payment/confirm/:id - Confirm/cancel order
router.put("/status/:orderId", updateOrderStatus); // PUT /api/payment/status/:id - Update order status

export default router;
