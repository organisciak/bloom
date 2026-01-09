import { useState } from 'react';
import { logger } from '@strudel/core';

// type Props = { error: Error | null, context?: any };
export default function UserFacingErrorMessage(Props) {
  const { error, context } = Props;
  const [isFixing, setIsFixing] = useState(false);

  if (error == null) {
    return;
  }

  const handleFix = async () => {
    if (!context?.editorRef?.current) {
      logger('[fix] No editor available', 'error');
      return;
    }

    setIsFixing(true);

    try {
      const code = context.editorRef.current.code || '';
      const errorMessage = error.message || 'Unknown error';
      const prompt = `Fix this error: ${errorMessage}`;

      const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
        ? (import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`)
        : '/';
      const apiUrl = `${baseUrl}api/claude-api`;

      logger('[fix] Requesting fix from AI...', 'highlight');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt,
          code,
          selection: '',
          soundContext: typeof window !== 'undefined' ? window.__strudelSoundContext : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Fix request failed');
      }

      if (!data?.code) {
        throw new Error('AI returned empty content');
      }

      context.editorRef.current.setCode(data.code);
      logger('[fix] Applied AI fix', 'highlight');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fix request failed';
      logger(`[fix] ${message}`, 'error');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="text-background px-2 py-1 bg-foreground w-full ml-auto flex items-center justify-between">
      <span>Error: {error.message || 'Unknown Error :-/'}</span>
      {context?.editorRef && (
        <button
          onClick={handleFix}
          disabled={isFixing}
          className="ml-4 px-3 py-1 text-xs bg-background text-foreground border border-background rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFixing ? 'Fixing...' : 'Fix'}
        </button>
      )}
    </div>
  );
}
