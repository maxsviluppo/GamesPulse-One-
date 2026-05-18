import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCmeDN-_CqIzf51S4aJyHEt_lnah2KFYRk";
const genAI = new GoogleGenAI({ apiKey: API_KEY });

export async function POST(request: Request) {
  try {
    const { title, source, content } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Titolo mancante" }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ error: "Client Gemini non configurato" }, { status: 500 });
    }

    const prompt = `Sei il capo-redattore di GamesPulse, una testata giornalistica di gaming premium.
Scrivi un articolo editoriale originale, approfondito, autorevole e ricco di dettagli in lingua italiana, basandoti sulla seguente notizia.

NOTIZIA DI RIFERIMENTO:
- Titolo Originale: ${title}
- Fonte: ${source || "Web"}
- Dettagli di partenza: ${content || ""}

REQUISITI DELL'ARTICOLO (FONDAMENTALI PER IL SEO E ADSENSE):
1. Lunghezza: Almeno 800 parole. Deve essere un articolo lungo, completo e di valore.
2. Struttura: Suddividi l'articolo in sezioni chiare usando intestazioni in formato Markdown (es. ## Titolo Sezione, ### Sottotitolo).
3. Toni: Cyberpunk, professionale, eccitante, critico e informato.
4. Contenuto obbligatorio:
   - Un'introduzione accattivante che introduce il contesto ed il trend di mercato.
   - Una sezione di ANALISI DEGLI ELEMENTI CHIAVE (es. impatto sui giocatori, novità tecniche, trend).
   - Un elenco puntato dei PUNTI DI FORZA ed uno per i PUNTI DI DEBOLEZZA / CRITICITÀ.
   - Una sezione esclusiva "IL PARERE DI GAMESPULSE" che esprime un giudizio critico forte sul futuro di questo annuncio o notizia.
   - Una conclusione decisa che riassume i punti e fa una domanda aperta ai lettori.

Genera solo l'articolo in formato Markdown puro (senza blocchi di codice \`\`\`markdown all'inizio o alla fine, scrivi direttamente il testo). Non includere il titolo dell'articolo all'inizio, inizia direttamente dall'introduzione.`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!text) {
      return NextResponse.json({ error: "Gemini non ha restituito alcun testo" }, { status: 500 });
    }

    // Generate a quick one-sentence AI summary for the feed page card
    const summaryPrompt = `Leggi il seguente articolo di gaming ed estrai una singola frase di riassunto dinamica, accattivante ed entusiasmante in italiano (massimo 25 parole).
    
    Articolo:
    ${text.substring(0, 1000)}
    
    Riassunto:`;

    const summaryResult = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: summaryPrompt }] }]
    });

    const summary = summaryResult.text || summaryResult.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return NextResponse.json({ 
      content: text,
      aiSummary: summary
    });

  } catch (error: any) {
    console.error("Errore nella generazione dell'editoriale:", error);
    return NextResponse.json({ error: error?.message || "Errore sconosciuto" }, { status: 500 });
  }
}
