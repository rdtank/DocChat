import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { notFound } from "../lib/errors";
import { requireAuth } from "../middleware/requireAuth";
import { getUserById, login, signup } from "../services/authService";
import { loginSchema, signupSchema } from "../validators/auth";

const router = Router();

// POST /auth/signup — create account, return user + JWT
router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const input = signupSchema.parse(req.body);
    const result = await signup(input);
    res.status(201).json(result);
  }),
);

// POST /auth/login — authenticate, return user + JWT
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await login(input);
    res.status(200).json(result);
  }),
);

// GET /auth/me — protected; returns the current user from the JWT
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.userId!);
    if (!user) throw notFound("User not found");
    res.json({ user });
  }),
);

export default router;
