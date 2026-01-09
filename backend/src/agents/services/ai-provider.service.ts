import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export interface AIProviderResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason: string;
}

@Injectable()
export class AIProviderService {
  private anthropic: Anthropic;
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    const claudeKey = this.config.get<string>('CLAUDE_API_KEY');
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');

    if (claudeKey) {
      this.anthropic = new Anthropic({
        apiKey: claudeKey,
      });
    }

    if (openaiKey) {
      this.openai = new OpenAI({
        apiKey: openaiKey,
      });
    }
  }

  async executeClaudePrompt(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'claude-sonnet-4-20250514',
    maxTokens: number = 8000,
  ): Promise<AIProviderResponse> {
    if (!this.anthropic) {
      throw new Error('Claude API key not configured');
    }

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');

    return {
      content: textContent ? (textContent as any).text : '',
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      finishReason: response.stop_reason || 'end_turn',
    };
  }

  async executeOpenAIPrompt(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'gpt-4o',
    maxTokens: number = 8000,
  ): Promise<AIProviderResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const choice = response.choices[0];

    return {
      content: choice.message.content || '',
      model: response.model,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
      finishReason: choice.finish_reason || 'stop',
    };
  }

  async executePrompt(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    maxTokens: number = 8000,
  ): Promise<AIProviderResponse> {
    if (model.startsWith('claude-')) {
      return this.executeClaudePrompt(systemPrompt, userPrompt, model, maxTokens);
    } else if (model.startsWith('gpt-')) {
      return this.executeOpenAIPrompt(systemPrompt, userPrompt, model, maxTokens);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  }

  isClaudeAvailable(): boolean {
    return !!this.anthropic;
  }

  isOpenAIAvailable(): boolean {
    return !!this.openai;
  }
}
