import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessageList } from './ChatMessageList';
import { useChatStore } from '../store/chatStore';
import { useSessionEnvironmentStore } from '../store/sessionEnvironmentStore';

function seedMessage(content: string) {
  useSessionEnvironmentStore.setState({ selectedThreadId: 'thread-1' });
  useChatStore.setState({
    threadStateById: {
      'thread-1': {
        threadId: 'thread-1',
        messages: [
          {
            id: 'message-1',
            role: 'assistant',
            content,
            timestamp: 1_700_000_000_000,
            toolCalls: [],
            isStreaming: false,
          },
        ],
        mode: 'chat',
        isProcessing: false,
        activeMention: null,
        inputDraft: '',
      },
    },
  });
}

describe('ChatMessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders safe markdown links as anchors', () => {
    seedMessage('Read the [docs](https://example.com/docs).');

    render(<ChatMessageList />);

    expect(screen.getByRole('link', { name: 'docs' })).toHaveAttribute(
      'href',
      'https://example.com/docs',
    );
  });

  it('renders safe mailto markdown links as anchors', () => {
    seedMessage('Email [support](mailto:support@example.com).');

    render(<ChatMessageList />);

    expect(screen.getByRole('link', { name: 'support' })).toHaveAttribute(
      'href',
      'mailto:support@example.com',
    );
  });

  it('renders unsafe markdown link text without creating a clickable link', () => {
    seedMessage('Do not open [bad](javascript:alert(1)).');

    render(<ChatMessageList />);

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'p' &&
          element.textContent === 'Do not open bad).',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'bad' })).not.toBeInTheDocument();
  });
});
