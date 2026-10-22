const config = require('../../config/env');
const logger = require('../../utils/logger');

function isConfigured() {
  return Boolean(
    config.ai.provider !== 'disabled' &&
      config.ai.apiKey &&
      config.ai.baseUrl &&
      config.ai.model,
  );
}

async function generateText({
  system,
  prompt,
  temperature = 0.4,
  maxTokens = 500,
}) {
  if (!isConfigured()) {
    return { text: '', configured: false, provider: config.ai.provider };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ai.timeoutMs);

  try {
    const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.ai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ai.model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}`);
    }

    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('AI provider returned an empty response');
    }

    return {
      text: text.trim(),
      configured: true,
      provider: config.ai.provider,
      model: config.ai.model,
    };
  } catch (error) {
    logger.warn('AI provider request failed; using the rule-based fallback.', {
      message: error.message,
    });
    return {
      text: '',
      configured: true,
      provider: config.ai.provider,
      error: error.name === 'AbortError' ? 'timeout' : 'provider_error',
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  generateText,
  isConfigured,
};
