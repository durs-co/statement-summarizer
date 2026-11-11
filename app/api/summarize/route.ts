// app/api/summarize/route.ts
// Receives a PDF upload, sends it to a model through Vercel AI Gateway, returns a summary.
import { generateText } from 'ai';

export const maxDuration = 60; // PDFs can take a while to read

const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions cap request bodies around 4.5 MB

const INSTRUCTIONS = `You are a careful financial-document analyst. Summarize the attached statement for a non-expert.

Respond in Markdown with these sections:
## Snapshot
Statement type, institution, period covered, account holder name redacted as "the account holder".
## Key numbers
A short table: opening balance, closing balance, total deposits/income, total withdrawals/spending, fees, interest. Write "not shown" if a figure isn't in the document.
## Where the money went
Top spending categories or largest transactions (up to 5).
## Things worth a look
Unusual charges, fees, rate changes, due dates, or anything that looks off.

Rules: only use numbers that appear in the document; never invent figures. If the PDF isn't a financial statement, say so briefly. Never repeat full account numbers. Do not give investment or financial advice.`;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'No file uploaded.' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return Response.json({ error: 'Please upload a PDF.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'PDF is too large (4 MB max).' }, { status: 413 });
    }

    const data = new Uint8Array(await file.arrayBuffer());

    const { text, usage, providerMetadata } = await generateText({
      model: 'google/gemini-2.5-flash', // any PDF-capable model on AI Gateway works
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: INSTRUCTIONS },
            { type: 'file', data, mediaType: 'application/pdf', filename: file.name },
          ],
        },
      ],
    });

    // AI Gateway reports what this request actually cost (in USD, as a string).
    const cost = Number(providerMetadata?.gateway?.cost);

    return Response.json({
      summary: text,
      stats: {
        tokens: usage.totalTokens ?? null,
        costUsd: Number.isFinite(cost) ? cost : null,
      },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Something went wrong summarizing that file.' }, { status: 500 });
  }
}