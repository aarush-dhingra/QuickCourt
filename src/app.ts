import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { generalRateLimit, authRateLimit } from "./middleware/rateLimit.middleware";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/notFound.middleware";
import { sendSuccess } from "./utils/apiResponse";

// Routes
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import venueRoutes from "./modules/venues/venue.routes";
import bookingRoutes from "./modules/bookings/booking.routes";
// Facility owner routes
import ownerRoutes from "./modules/facilityOwner/facilityOwner.routes";

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use("/api/v1/auth", authRateLimit);
app.use(generalRateLimit);

// Health check
app.get("/health", (_req, res) => {
  sendSuccess(res, { status: "ok", database: "connected" });
});

// Serve uploaded facility photos as static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/venues", venueRoutes);
app.use("/api/v1/bookings", bookingRoutes);
// Facility owner module — all routes require FACILITY_OWNER role JWT
app.use("/api/v1/owner", ownerRoutes);

// 404 handler
app.use(notFoundMiddleware);

// Error handler
app.use(errorMiddleware);

export default app;
