/**
 * OpenAI 消息接口
 */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI 响应接口
 */
export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 使用 OpenAI API 补全消息
 * @param messages 消息数组
 * @param options 可选配置
 * @returns Promise<OpenAIResponse> 返回完整的OpenAI响应
 */
export const completeMessages = async (
  messages: OpenAIMessage[],
  options?: {
    response_format?: { type: 'json_object' | 'text' };
  }
): Promise<OpenAIResponse> => {
  // 从环境变量读取配置
  const apiKey = process.env.OPENAI_API_KEY || '';
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  try {
    const requestBody: any = {
      model,
      messages,
      temperature: 0, // 总是设置为 0，提取内容不需要随机性
      // 不设置 max_tokens，让API自动决定
    };

    // 添加可选的response_format
    if (options?.response_format) {
      requestBody.response_format = options.response_format;
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data: OpenAIResponse = await response.json();

    // 验证响应
    if (!data.choices?.[0]?.message?.content?.trim()) {
      throw new Error('Empty response from OpenAI API');
    }

    return data;
  } catch (error) {
    console.error('❌ Failed to call OpenAI API:', error);
    throw error;
  }
};
