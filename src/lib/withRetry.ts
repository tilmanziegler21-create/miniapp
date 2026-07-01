type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
};

function isRetryableError(error: unknown): boolean {
  const err = error as {
    code?: string;
    message?: string;
    response?: { status?: number };
  };
  const status = Number(err?.response?.status || 0);
  if (status === 408 || status === 429 || status >= 500) return true;
  if (!err?.response) return true;
  if (err.code === 'ECONNABORTED') return true;
  const message = String(err.message || '').toLowerCase();
  return message.includes('timeout') || message.includes('network');
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 500;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryableError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }

  throw lastError;
}
