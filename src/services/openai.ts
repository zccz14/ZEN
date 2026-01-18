import { MetaData } from '../metadata';

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
const startTime = Date.now();
let totalContentGenerated = 0;
const processingTaskIds = new Set<string>();

const printReport = () => {
  const speed = (totalContentGenerated / ((Date.now() - startTime) / 1000)).toFixed(2);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.error(
    `⏳ AI Processing output speed=${speed} total=${totalContentGenerated} elapsed=${elapsed} s tasks=${processingTaskIds.size}`
  );
  // 取前 5 个正在处理的任务ID
  let i = 5;
  for (const id of processingTaskIds) {
    if (i-- <= 0) break;
    console.error(` - processing task: ${id}`);
  }
};

let isReporting = false;
const setupReport = async () => {
  if (isReporting) return;
  isReporting = true;
  while (processingTaskIds.size > 0) {
    try {
      printReport();
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  isReporting = false;
};

/**
 * 使用 OpenAI API 补全消息
 * @param messages 消息数组
 * @param options 可选配置
 * @returns Promise<OpenAIResponse> 返回完整的OpenAI响应
 */
export const completeMessages = async (
  messages: OpenAIMessage[],
  options?: {
    /**
     * 可选的任务ID，用于标识请求，便于日志记录
     */
    task_id?: string;
    response_format?: { type: 'json_object' | 'text' };
  }
): Promise<OpenAIResponse> => {
  try {
    if (options?.task_id) {
      processingTaskIds.add(options.task_id);
      setupReport();
    }
    // 从环境变量读取配置
    const apiKey = process.env.OPENAI_API_KEY || '';
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const max_tokens = process.env.OPENAI_MAX_TOKENS ? +process.env.OPENAI_MAX_TOKENS : undefined; // 不填就使用模型默认值

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    let finishReason: string | null = null;
    let responseId: string | null = null;
    let responseModel: string | null = null;
    let responseCreated: number | null = null;
    let usage: OpenAIResponse['usage'] | null = null;

    const requestBody: any = {
      model,
      messages,
      temperature: 0, // 总是设置为 0，提取内容不需要随机性
      stream: true, // 启用流式响应
      max_tokens, // 可选的最大 token 数量
    };

    // 添加可选的response_format
    if (options?.response_format) {
      requestBody.response_format = options.response_format;
    }

    // 打印请求信息 (for debug)
    // if (MetaData.options.verbose) {
    //   for (const msg of messages) {
    //     console.info(`💬 [${msg.role}] ${msg.content}`);
    //   }
    // }

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

    // 处理流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留未完成的行

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

        if (trimmedLine.startsWith('data: ')) {
          const jsonStr = trimmedLine.slice(6);
          try {
            const chunk = JSON.parse(jsonStr);

            // 收集元数据
            if (chunk.id) responseId = chunk.id;
            if (chunk.model) responseModel = chunk.model;
            if (chunk.created) responseCreated = chunk.created;

            // 处理 choices
            if (chunk.choices && Array.isArray(chunk.choices)) {
              for (const choice of chunk.choices) {
                if (choice.delta?.content) {
                  totalContentGenerated += choice.delta.content.length;
                  content += choice.delta.content;
                }
                if (choice.finish_reason) {
                  finishReason = choice.finish_reason;
                }
              }
            }

            // 处理 usage
            if (chunk.usage) {
              usage = chunk.usage;
            }
          } catch (error) {
            console.warn('Failed to parse SSE chunk:', jsonStr, error);
          }
        }
      }
    }

    // 确保所有剩余数据被解码
    if (buffer) {
      buffer += decoder.decode();
      // 可以尝试解析剩余数据，但通常不会有完整数据
    }

    // 构建最终的响应对象
    const finalResponse: OpenAIResponse = {
      id: responseId || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: responseCreated || Math.floor(Date.now() / 1000),
      model: responseModel || model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: content,
          },
          finish_reason: finishReason || 'stop',
        },
      ],
      usage: usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };

    if (MetaData.options.verbose) {
      console.info('🤖 AI Token Usages', finalResponse.usage);
    }

    // 验证响应
    if (!finalResponse.choices?.[0]?.message?.content?.trim()) {
      throw new Error('Empty response from OpenAI API');
    }

    return finalResponse;
  } catch (error) {
    console.error('❌ Failed to call OpenAI API:', error);
    throw error;
  } finally {
    if (options?.task_id) {
      processingTaskIds.delete(options.task_id);
    }
  }
};
