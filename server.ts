import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialized Gemini client to prevent startup crash
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: key || "MISSING_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// AI Academic Advisor Endpoint
app.post("/api/gemini/advisor", async (req, res) => {
  try {
    const { prompt, history, role, userProfile } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        text: "⚠️ **Gemini API Key is not configured yet.**\n\nPlease add your `GEMINI_API_KEY` in the **Settings > Secrets** panel in the Google AI Studio interface to activate this premium KITS Guntur AI Academic Advisor feature!"
      });
    }

    const client = getGeminiClient();

    const systemInstruction = `You are "AeroAdvisor", the KITS Guntur premium AI Academic Advisor.
Your purpose is to help students, lecturers, and administrators with academic inquiries under the JNTU Kakinada (JNTUK) university guidelines.
- For STUDENTS: provide deep JNTUK exam preparation tips, detailed explanations of difficult concepts (such as Greedy Techniques or Analog Circuits), study schedule planners, and personalized learning guidance.
- For LECTURERS: assist in designing syllabus topics, drafting high-quality exam/quiz questions, and suggesting pedagogical techniques.
- For ADMINS: suggest structural improvements to academic processes, statistical analysis strategies for results, and attendance report frameworks.

Current User Profile:
- Role: ${role || "Student"}
- Name: ${userProfile?.name || "Scholar"}
- Department: ${userProfile?.department || "Computer Science & Engineering"}
- Semester: ${userProfile?.semester || "Semester 3"}

Since you are running in High Thinking Mode (gemini-3.1-pro-preview), you MUST provide structured, deeply-researched, rigorous academic reasoning. Use step-by-step break-downs, rich markdown formatting, list priorities, and present clean formulas or code snippets if relevant. Always maintain a highly encouraging and prestigious academic tone.`;

    // Map history to parts if present, or construct a simple formatted message
    let contents = "";
    if (history && history.length > 0) {
      contents = history.map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join("\n") + `\nUser: ${prompt}`;
    } else {
      contents = prompt;
    }

    // Call gemini-3.1-pro-preview with ThinkingLevel.HIGH as mandated
    const response = await client.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        }
      }
    });

    res.json({
      text: response.text || "No response generated."
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      error: "Failed to generate AI advice",
      details: error.message || String(error)
    });
  }
});

// In-memory OTP storage: Map of email (lowercase) -> { otp, expires }
const otpStore = new Map<string, { otp: string; expires: number }>();

// Endpoint to send OTP
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    otpStore.set(normalizedEmail, { otp, expires });
    console.log(`[OTP GENERATED] Email: ${normalizedEmail} | OTP: ${otp}`);

    let transporter: any = null;
    let isTestAccount = false;
    let testMailUrl = "";

    // Check if custom SMTP is defined
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log(`Using custom SMTP transport for ${process.env.SMTP_USER}`);
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Fallback to dynamic test account on Ethereal.email
      isTestAccount = true;
      try {
        console.log("Generating Ethereal SMTP test account for OTP verification...");
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } catch (etherealErr) {
        console.error("Ethereal test account generation failed, falling back to console-only logging:", etherealErr);
      }
    }

    if (transporter) {
      const mailOptions = {
        from: `"KITS Guntur Academic Portal" <${process.env.SMTP_USER || "noreply@kitsguntur.ac.in"}>`,
        to: normalizedEmail,
        subject: "Verification Code (OTP) for KITS Guntur Portal Registration",
        text: `Hello,\n\nYour security verification code (OTP) to complete your KITS Guntur Portal registration is: ${otp}\n\nThis code is valid for 10 minutes. Please enter this code in the registration form to activate your profile.\n\nBest Regards,\nCollege Management & Academic Office\nKITS Guntur`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 4px solid #C79F27; padding-bottom: 15px; margin-bottom: 20px; background-color: #002147; padding: 15px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">KITS Guntur</h1>
              <p style="color: #cbd5e1; margin: 5px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">Academic Portal Verification</p>
            </div>
            
            <p style="font-size: 14px; color: #334155; line-height: 1.5;">Hello,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.5;">Thank you for initiating your registration on the <strong>KITS Guntur Academic Portal</strong>. To verify your email identity and activate your account, please use the following one-time passcode (OTP):</p>
            
            <div style="text-align: center; margin: 25px 0; padding: 15px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
              <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #002147; letter-spacing: 4px;">${otp}</span>
            </div>
            
            <p style="font-size: 12px; color: #64748b; line-height: 1.5;">This OTP code is temporary and is valid for <strong>10 minutes</strong>. If you did not request this code, you can safely ignore this email.</p>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
              KKR & KSR Institute of Technology and Sciences<br/>
              JNTUK Affiliated • NBA Accredited College Division<br/>
              Guntur, Andhra Pradesh, India
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      if (isTestAccount) {
        testMailUrl = nodemailer.getTestMessageUrl(info) || "";
        console.log(`[Ethereal Test Mail Sent] URL: ${testMailUrl}`);
      }
    }

    res.json({
      success: true,
      message: "One-Time Passcode (OTP) successfully sent to your Gmail address!",
      isTestAccount,
      testOtp: isTestAccount ? otp : null,
      testMailUrl: testMailUrl || null
    });
  } catch (err: any) {
    console.error("Failed to send verification email:", err);
    res.status(500).json({
      error: "Failed to send verification email. Please check your SMTP configuration.",
      details: err.message || String(err),
    });
  }
});

// Endpoint to verify OTP
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email and verification code are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const stored = otpStore.get(normalizedEmail);

    if (!stored) {
      return res.status(400).json({ error: "No verification request found for this email. Please request a new OTP code." });
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: "The verification code has expired. Please request a new OTP code." });
    }

    if (stored.otp !== code.trim()) {
      return res.status(400).json({ error: "Incorrect verification code. Please check your email and try again." });
    }

    // OTP verified successfully! Clear it from memory
    otpStore.delete(normalizedEmail);

    res.json({
      success: true,
      message: "Gmail address successfully verified! Your registration is complete."
    });
  } catch (err: any) {
    console.error("OTP Verification Error:", err);
    res.status(500).json({
      error: "Verification failed. Please try again.",
      details: err.message || String(err)
    });
  }
});

// Seed status checker / utility
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", keyConfigured: !!process.env.GEMINI_API_KEY });
});

// Configure Vite middleware and static asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production assets...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Campus Hub Academic Portal Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
