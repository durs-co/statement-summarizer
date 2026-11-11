// app/page.tsx
'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    setSummary('');

    const body = new FormData();
    body.append('file', file);

    try {
      const res = await fetch('/api/summarize', { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setSummary(json.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Statement Summarizer</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Upload a bank, credit card, or brokerage statement (PDF) and get a plain-English summary.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-white"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="rounded bg-indigo-600 px-5 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Reading…' : 'Summarize'}
        </button>
      </form>

      {error && <p className="mt-6 rounded bg-red-50 p-4 text-red-700">{error}</p>}

      {summary && (
        <article className="prose dark:prose-invert mt-8 max-w-none rounded border p-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
        </article>
      )}

      <p className="mt-12 text-xs text-gray-500">
        Demo only. Files are sent to an AI model and not stored. Not financial advice. Use sample or redacted statements.
      </p>
    </main>
  );
}