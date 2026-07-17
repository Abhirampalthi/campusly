import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini "Can I Bunk" slagger route
  app.post("/api/gemini/explain-bunk", async (req, res) => {
    const { subjectName, attendance, target, canBunk, bunksAvailable } = req.body;
    
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Use local slang generator as fallback if API key is not set
      const fallbackMsg = canBunk
        ? `Yo, you are absolutely chilling with ${attendance}% in ${subjectName}! You've got ${bunksAvailable} bunk token(s) in your bag, no cap. Go grab a coffee or sleep in, you've earned it! 😎`
        : `Bro, you are literally cooked. Your ${subjectName} attendance is at ${attendance}%, which is below your ${target}% target! You need to show up to the next ${bunksAvailable} classes straight, fr, or you are getting blocked. Get your butt to class! 💀`;
      return res.json({ explanation: fallbackMsg });
    }

    try {
      // Lazy initialize the SDK only inside the route handler
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are a Gen-Z college student. Explain in funny, playful, and slang-filled student-friendly language (use words like 'bunk', 'fr', 'no cap', 'cooked', 'clutched', 'rizz', 'goated', 'absolute cinema') whether the student can bunk their next class.
      Subject: ${subjectName}
      Current Attendance: ${attendance}% (Target: ${target}%)
      Can they bunk? ${canBunk ? `Yes, they can bunk ${bunksAvailable} class(es).` : `No, they cannot bunk. They must attend ${bunksAvailable} more classes consecutively to hit the target.`}
      Keep it brief, 2-3 sentences. No bullet points. Speak directly to the student.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const explanation = result.text || "Bro, the AI went to sleep, but you should check your attendance anyway.";
      res.json({ explanation });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      const fallbackMsg = canBunk
        ? `Yo, you are absolutely chilling with ${attendance}% in ${subjectName}! You've got ${bunksAvailable} bunk token(s) in your bag, no cap. Go grab a coffee or sleep in, you've earned it! 😎 (Gemini offline)`
        : `Bro, you are literally cooked. Your ${subjectName} attendance is at ${attendance}%, which is below your ${target}% target! You need to show up to the next ${bunksAvailable} classes straight, fr, or you are getting blocked. Get your butt to class! 💀 (Gemini offline)`;
      res.json({ explanation: fallbackMsg });
    }
  });

  // Gemini "Agent Optimize" route
  app.post("/api/gemini/agent-optimize", async (req, res) => {
    const { subjects, timetable, collegeName, persona, safetyBuffer } = req.body;
    
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Return a mock intelligent fallback matching the schema if API key is not set
      const score = subjects.length > 0 ? Math.round(subjects.reduce((acc: number, curr: any) => acc + (curr.present / (curr.present + curr.absent || 1)) * 100, 0) / subjects.length) : 80;
      const verdict = score >= 80 ? "CHILLING APPROVED" : score >= 70 ? "STABILIZE WARNING" : "CRITICAL WARNING";
      const fallbackMsg = {
        strategy: {
          score,
          verdict,
          summary: `Mock AI Agent local scan completed. Attendance score stands at ${score}%. Local rules simulation applied successfully.`,
          bunkSchedule: subjects.map((s: any) => ({
            subject: s.name,
            action: s.present / (s.present + s.absent || 1) * 100 >= s.target + safetyBuffer ? "APPROVED BUNK" : "MUST ATTEND",
            reasoning: `Attendance is ${Math.round(s.present / (s.present + s.absent || 1) * 100)}% (Target: ${s.target}%) with buffer safety boundary configured at +${safetyBuffer}%.`
          })),
          alerts: [
            `Geofence verification completed autonomously at ${collegeName || 'your college'}.`,
            `Simulated local alarm triggers set if any subject drops below safety buffer target.`
          ],
          agentNote: "No Gemini key configured in Secrets, so I am running offline in smart simulation mode, no cap!"
        }
      };
      return res.json(fallbackMsg);
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const personaInstruction = {
        warden: "You are a Strict Academic Warden. You are extremely serious, value punctuality, hate bunking, and demand 100% compliance. Your roasts are about failing college, working a bad job, and disappointing parents.",
        senior: "You are a Lazy Final-Year Senior. You believe classes are optional, sleep and coffee are paramount, and you can always 'clutch' the exams at the end. Your advice maximizes sleeping/bunking safely, and you speak in relaxed college slang.",
        data: "You are a Quant Trading Data Nerd Analyst. You look at everything as a probability distribution, talk about drift risk, standard deviations, boundary constraints, and optimizing utility functions.",
        genz: "You are a savage Gen-Z Groupchat Admin. You use high-density slang like 'skibidi', 'rizz', 'no cap', 'cooked', 'clutched', 'fr fr', 'absolute cinema', 'gyatt', '💀'. You roast them brutally for being scared or lacking class rizz."
      }[persona as 'warden'|'senior'|'data'|'genz'] || "You are a smart, friendly academic advisor co-pilot agent.";

      const subjectDataStr = JSON.stringify(subjects.map((s: any) => ({
        name: s.name,
        attendance: `${Math.round(s.present / (s.present + s.absent || 1) * 100)}%`,
        target: `${s.target}%`,
        rawPresent: s.present,
        rawAbsent: s.absent
      })));

      const timetableDataStr = JSON.stringify(timetable);

      const prompt = `You are an automated intelligent scheduler and academic optimizer agent operating under this persona: ${personaInstruction}.
      
      Analyze the student's college attendance data and upcoming schedule. Compute an overall strategic recommendation.
      
      Student Subjects Data:
      ${subjectDataStr}
      
      Student Timetable Schedule:
      ${timetableDataStr}
      
      Safety Alert Buffer: +${safetyBuffer}% (Trigger warning if attendance is within this buffer limit above the target)
      College Geofence: ${collegeName || "Main Campus"}
      
      You must return a JSON object strictly matching this schema:
      {
        "score": number, // Overall academic health score (0 to 100)
        "verdict": string, // Short verdict e.g. "CHILLING APPROVED", "STABILIZE WARNING", "EMERGENCY CLUTCH", "WAKE UP CALL"
        "summary": string, // 1-2 sentence tactical advisory summarizing their status in your persona's voice.
        "bunkSchedule": [
          {
            "subject": string, // Name of subject from the data
            "action": string, // Action advice: e.g. "MUST ATTEND", "APPROVED BUNK", "OPTIONAL BUNK", "CLUTCH CLASS"
            "reasoning": string // Brief reasoning explaining why, in your persona's style, based on attendance vs target + buffer.
          }
        ],
        "alerts": [
          string // List of 2-3 automated alerts/actions you've simulated or scheduled to safeguard their attendance.
        ],
        "agentNote": string // A highly styled, custom signoff/roast tailored to your persona (1 short sentence).
      }
      
      Provide valid JSON output only. Do not wrap the JSON output in markdown backticks or triple-quotes. Ensure all keys and values conform strictly to JSON.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const rawText = result.text || "{}";
      const strategy = JSON.parse(rawText.trim());
      res.json({ strategy });
    } catch (error: any) {
      console.error("Agent Optimize API error:", error);
      res.status(500).json({ error: "Failed to optimize strategy." });
    }
  });

  // Gemini "Generate Emergency Rescue Plan" route
  app.post("/api/gemini/generate-rescue-plan", async (req, res) => {
    const { taskTitle, subject, hoursLeft, completion, complexity, procrastinationReason } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      // Local fallback simulator logic when no API key is set
      const dynamicTimeline = [];
      const interval = Math.max(1, Math.floor(hoursLeft / 3));
      dynamicTimeline.push({
        hour: `Hour 1-${interval}`,
        action: `Sledgehammer Outlines & Setup`,
        focus: `Eliminate all tech distractions. Split up the requirements of ${taskTitle} into 3 basic sections.`
      });
      dynamicTimeline.push({
        hour: `Hour ${interval + 1}-${interval * 2}`,
        action: `High-Speed Writing Block (No Censorship)`,
        focus: `Write continuous raw text without correcting errors. Quantity is king under DEFCON pressure.`
      });
      dynamicTimeline.push({
        hour: `Hour ${interval * 2 + 1}-${hoursLeft}`,
        action: `Rapid Formatting & Submit Drive`,
        focus: `Add citations, read-through once, verify export requirements, and slam the upload button.`
      });

      return res.json({
        plan: {
          savageAdvisory: `Offline mode simulation. You procrastinated because you "${procrastinationReason || 'did nothing'}". With ${hoursLeft} hours left, we need a flawless high-speed clutch execution. Put the phone away!`,
          defenseTactics: [
            "Put your phone in another room (fr no cap)",
            "Load the lo-fi synthwave playlist immediately",
            "Tell your friends you died (no distraction mode)"
          ],
          timeline: dynamicTimeline,
          survivalScore: Math.min(95, Math.max(5, Math.round(completion + (hoursLeft * 3.5))))
        }
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are a savage Gen-Z college academic advisor and panic negotiator co-pilot.
      Generate a believable and extremely structured hour-by-hour emergency clutch rescue protocol for a college student who procrastinated and has an upcoming high-stakes assignment/exam due.
      
      Details:
      - Assignment Title: "${taskTitle}"
      - Subject: "${subject}"
      - Hours Remaining: ${hoursLeft} hours
      - Current Progress: ${completion}% completed
      - Complexity: "${complexity}"
      - Why they procrastinated: "${procrastinationReason}"
      
      Your response must be a single valid JSON object containing a "plan" key with the following schema:
      {
        "plan": {
          "savageAdvisory": "A brutal, hilarious, slang-filled (fr, no cap, cooked, clutch, rizz, goated, etc.) reality check calling them out for their procrastination reason and motivating them to lock in.",
          "defenseTactics": [
            "List of 3 savage, practical tips to block distractions, increase focus, or clear their mind under pressure (e.g. putting their phone in the trash, locking their door, drinking extreme coffee)"
          ],
          "timeline": [
            {
              "hour": "A descriptive label (e.g., 'Hour 1-2' or 'Hour 3')",
              "action": "A short, active tactical command (e.g., 'Sledgehammer Outlines' or 'Drafting Block')",
              "focus": "A specific, step-by-step guidance on what exactly to do for this assignment during this phase."
            }
          ],
          "survivalScore": number // Estimated probability of passing/succeeding from 0 to 100 based on hoursLeft and progress.
        }
      }
      
      Provide valid JSON output only. Do not wrap the JSON output in markdown backticks or triple-quotes. Ensure all keys and values conform strictly to JSON.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const rawText = result.text || "{}";
      const planData = JSON.parse(rawText.trim());
      res.json(planData);
    } catch (error: any) {
      console.error("Rescue plan API error:", error);
      res.status(500).json({ error: "Failed to generate emergency rescue plan." });
    }
  });

  // Gemini "Generate College Email" route
  app.post("/api/gemini/generate-outreach", async (req, res) => {
    const { subjectName, professorName, reason, tone, studentName, purpose } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      const fallbackSubject = `${purpose ? purpose.toUpperCase() : 'Academic Inquiry'}: ${subjectName} - ${studentName || 'Student'}`;
      const fallbackBody = `Dear ${professorName || 'Professor'},\n\nI hope you are having a wonderful week.\n\nI am writing to you regarding ${subjectName} in reference to my interest/question: "${reason || 'Discussing course content'}".\n\nI wanted to ask if we could coordinate on this at your earliest convenience.\n\nThank you very much for your time, support, and guidance.\n\nBest regards,\n${studentName || 'Your Student'}`;
      return res.json({
        subject: fallbackSubject,
        body: fallbackBody,
        automationTip: "Note: Running in offline simulation mode. Set a Gemini API key in Settings > Secrets to unlock personalized, high-quality, and context-aware AI email generations!"
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are an expert AI Email Assistant specializing in helping college students craft highly professional, clear, and effective academic and professional emails.
      
      Generate a realistic, well-structured email draft from a student named "${studentName || "Alex"}" to a professor/recipient named "${professorName || "Professor"}".
      
      Details:
      - Subject/Course/Topic context: "${subjectName}"
      - Purpose of the Email: "${purpose || "General Inquiry"}"
      - Key Points / Context to integrate: "${reason}"
      - Tone Style: "${tone}" (e.g. Polite & Professional, Confident & Direct, Warm & Grateful, Concise & Quick)
      
      Guidelines:
      1. Write a compelling, clear, and contextually appropriate subject line.
      2. Ensure the email body is realistic, polite, and completely written out. Do NOT use placeholder names like [Your Name] as the student's name is "${studentName || "Alex"}".
      3. Keep the email concise, persuasive, and structurally pristine (with appropriate greetings, spacing, bullet points if helpful, and clear sign-offs).
      4. Use bracketed placeholders (e.g., "[Insert Date]" or "[Insert Time]") ONLY for details that are not provided in the prompt but are absolutely necessary for scheduling.
      
      Your output must be a valid JSON object strictly matching this schema:
      {
        "subject": "A compelling, clear, and professional email subject line",
        "body": "The full body text of the email, formatted with newlines. Make it match the requested tone perfectly.",
        "automationTip": "A professional and tactical tip on how the student can prepare for this request or follow up successfully."
      }
      
      Provide valid JSON output only. Do not wrap the JSON output in markdown backticks or triple-quotes. Ensure all keys and values conform strictly to JSON.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const rawText = result.text || "{}";
      const data = JSON.parse(rawText.trim());
      res.json(data);
    } catch (error: any) {
      console.error("Email Generator API error:", error);
      res.status(500).json({ error: "Failed to generate college email draft." });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
