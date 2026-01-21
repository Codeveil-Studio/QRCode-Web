import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Import routes
import statsRoutes from "./routes/stats";
import issuesRoutes from "./routes/issues";
import assetsRoutes from "./routes/assets";
import profileRoutes from "./routes/profile";
import typesRoutes from "./routes/types";
import authRoutes from "./routes/auth";
import orgsRoutes from "./routes/orgs";
import organizationsRoutes from "./routes/organizations";
import { checkEmailDomain } from "./controllers/organizationController";
import subscriptionsRoutes from "./routes/subscriptions";
import notificationsRoutes from "./routes/notifications";
import confirmationsRoutes from "./routes/confirmations";
import reportsRoutes from "./routes/reports";
import supportRoutes from "./routes/support";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://*.supabase.co"],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        process.env.FRONTEND_URL,
        "https://qresolve-two.vercel.app",
        "http://localhost:3000",
      ];
      
      // Check if the origin matches any allowed origin (handling trailing slashes)
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (!allowedOrigin) return false;
        // Normalize both URLs by removing trailing slashes for comparison
        const normalizedOrigin = origin.replace(/\/$/, "");
        const normalizedAllowed = allowedOrigin.replace(/\/$/, "");
        return normalizedOrigin === normalizedAllowed;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"], // Expose Set-Cookie header
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Import webhook handler before JSON parsing
import { handleStripeWebhook } from "./controllers/subscriptionsController";

// Webhook route MUST be registered before JSON parsing middleware
app.post(
  "/api/subscriptions/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// Body parsing middleware (for all other routes)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parsing middleware
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan("combined"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/issues", issuesRoutes);
app.use("/api/assets", assetsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/asset-types", typesRoutes);
app.use("/api/orgs", orgsRoutes);
app.get("/api/organizations/check-email-domain", checkEmailDomain);
app.use("/api/organizations", organizationsRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/subscription", subscriptionsRoutes); // Alias for frontend compatibility
app.use("/api/notifications", notificationsRoutes);
app.use("/api/confirmations", confirmationsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/support", supportRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Global error handler:", err);

    res.status(err.status || 500).json({
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});
