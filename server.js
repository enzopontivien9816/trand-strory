const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
let last = 0;

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/image", async (req, res) => {
  const prompt = String(req.query.prompt || "").slice(0, 1200).trim();
  if (!prompt) return res.status(400).json({ error: "Écris un prompt." });
  const wait = 15000 - (Date.now() - last);
  if (wait > 0) return res.status(429).json({ error: "Patiente " + Math.ceil(wait / 1000) + " s, puis réessaie." });
  last = Date.now();
  const seed = parseInt(req.query.seed) || Math.floor(Math.random() * 1e6);
  const url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) +
    "?model=flux&width=768&height=1344&seed=" + seed;
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: "Le générateur a répondu " + r.status + "." });
    res.set("Content-Type", r.headers.get("content-type") || "image/jpeg");
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ error: "Générateur injoignable." });
  }
});

app.get("/api/voice", async (req, res) => {
  const text = String(req.query.text || "").slice(0, 300).trim();
  if (!text) return res.status(400).json({ error: "Texte manquant." });
  try {
    const r = await fetch("https://text.pollinations.ai/" + encodeURIComponent(text) + "?model=openai-audio&voice=nova");
    if (!r.ok) return res.status(502).json({ error: "Voix indisponible." });
    res.set("Content-Type", r.headers.get("content-type") || "audio/mpeg");
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ error: "Voix injoignable." });
  }
});

app.get("/api/story", async (req, res) => {
  const idea = String(req.query.idea || "").slice(0, 600).trim();
  const n = Math.min(12, Math.max(3, parseInt(req.query.n) || 12));
  const style = String(req.query.style || "Pixar semi-realistic 3D").slice(0, 60);
  if (!idea) return res.status(400).json({ error: "Décris ton histoire." });
  const p = "Tu es scénariste de vidéos TikTok verticales. Idée : " + idea +
    ". Écris une histoire en exactement " + n + " scènes de 5 secondes, style " + style +
    ". Accroche forte, tension, retournement, fin ouverte (partie 2). Tous publics. " +
    "Chaque image_en : prompt en anglais complet qui commence par le style, redécrit chaque personnage présent, le décor, le cadrage, finit par vertical 9:16, 4K. " +
    "Chaque replique_fr : français, 12 mots max, ou chaîne vide. " +
    "Réponds UNIQUEMENT avec du JSON valide : {\"titre\":\"\",\"legende\":\"\",\"scenes\":[{\"image_en\":\"\",\"replique_fr\":\"\"}]}";
  try {
    const r = await fetch("https://text.pollinations.ai/" + encodeURIComponent(p) + "?model=openai");
    const t = await r.text();
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    const obj = JSON.parse(t.slice(a, b + 1));
    if (!obj.scenes || !obj.scenes.length) throw new Error("vide");
    res.json(obj);
  } catch (e) {
    res.status(502).json({ error: "Le scénario automatique a échoué. Réessaie, ou colle un scénario fait avec Claude." });
  }
});

app.listen(PORT, () => console.log("Ouvre http://localhost:" + PORT));
