import type { HttpClient } from '../http';
import type {
  AssistantChatRequest,
  AssistantChatResponse,
} from '@seamflow/schemas';

// Tailor copilot chat (docs/tailor-copilot-plan.md). One call per turn: the
// server runs the tool loop and returns the reply plus, when the model
// proposed a write, a `pendingAction` the app must confirm and execute itself
// through the normal typed resources. Returns 503 until the server has a
// funded ANTHROPIC_API_KEY.
export function makeAssistantResource(http: HttpClient) {
  return {
    chat(input: AssistantChatRequest): Promise<AssistantChatResponse> {
      return http.post<AssistantChatResponse>('/assistant/chat', input);
    },
  };
}

export type AssistantResource = ReturnType<typeof makeAssistantResource>;
