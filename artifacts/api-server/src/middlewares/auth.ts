import { type Request, type Response, type NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.["userId"]) {
    res.status(401).json({ error: "Unauthorized", message: "Please log in to continue" });
    return;
  }
  next();
}
