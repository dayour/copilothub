import { useState, type CSSProperties } from 'react';
import {
  Bot,
  MessageCircle,
  Zap,
  Globe,
  TestTube,
  Rocket,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  BookOpen,
  Link,
  FileText,
  Settings,
} from 'lucide-react';

type Step = {
  id: string;
  title: string;
  description: string;
  Icon: typeof Bot;
};

type Topic = {
  id: string;
  title: string;
  triggers: string;
  nodes: string[];
};

type ParamMapping = {
  id: string;
  field: string;
  source: string;
  required: boolean;
};

type KnowledgeSource = {
  id: string;
  type: 'url' | 'file' | 'sharepoint';
  value: string;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

const steps: Step[] = [
  {
    id: 'create',
    title: 'Create Agent',
    description: 'Name, icon, and language configuration.',
    Icon: Bot,
  },
  {
    id: 'topics',
    title: 'Design Topics',
    description: 'Triggers and conversational flows.',
    Icon: MessageCircle,
  },
  {
    id: 'actions',
    title: 'Configure Actions',
    description: 'Automation and parameter mappings.',
    Icon: Zap,
  },
  {
    id: 'knowledge',
    title: 'Knowledge Sources',
    description: 'Grounding content and connections.',
    Icon: Globe,
  },
  {
    id: 'test',
    title: 'Test Agent',
    description: 'Simulated chat validation.',
    Icon: TestTube,
  },
  {
    id: 'publish',
    title: 'Publish',
    description: 'Channels and deployment readiness.',
    Icon: Rocket,
  },
];

const iconOptions = [
  { id: 'bot', label: 'Copilot Bot', Icon: Bot },
  { id: 'zap', label: 'Automation', Icon: Zap },
  { id: 'globe', label: 'Global Helper', Icon: Globe },
  { id: 'settings', label: 'IT Helper', Icon: Settings },
];

const languageOptions = [
  'English (US)',
  'English (UK)',
  'French',
  'German',
  'Spanish',
  'Japanese',
];

const initialTopics: Topic[] = [
  {
    id: 'topic-1',
    title: 'Order status escalation',
    triggers: 'Where is my order?; Track shipment; Delivery ETA',
    nodes: [
      'Hi, I can check that for you.',
      'What is your order number?',
      'Thanks. I found a shipment and will share the ETA.',
    ],
  },
  {
    id: 'topic-2',
    title: 'Password reset guidance',
    triggers: 'Reset my password; Locked out; MFA help',
    nodes: [
      'I can help with password reset.',
      'Do you want to reset via email or SMS?',
      'Great. I have initiated the reset flow.',
    ],
  },
];

const initialMappings: ParamMapping[] = [
  {
    id: 'map-1',
    field: 'OrderId',
    source: 'conversation.orderId',
    required: true,
  },
  {
    id: 'map-2',
    field: 'CustomerEmail',
    source: 'profile.email',
    required: false,
  },
  {
    id: 'map-3',
    field: 'Priority',
    source: 'conversation.intent',
    required: true,
  },
];

const initialSources: KnowledgeSource[] = [
  {
    id: 'src-1',
    type: 'url',
    value: 'https://contoso.com/support/fulfillment',
  },
  {
    id: 'src-2',
    type: 'file',
    value: 'ReturnPolicy.pdf',
  },
  {
    id: 'src-3',
    type: 'sharepoint',
    value: 'https://contoso.sharepoint.com/sites/helpcenter',
  },
];

const initialChat: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    content: 'Welcome to the Copilot Studio test panel. How can I help today?',
  },
  {
    id: 'msg-2',
    role: 'user',
    content: 'I need to track my shipment for order 54821.',
  },
  {
    id: 'msg-3',
    role: 'assistant',
    content: 'Got it. I can look that up. What is the delivery ZIP code?',
  },
  {
    id: 'msg-4',
    role: 'user',
    content: '98101.',
  },
];

const baseCardStyle: CSSProperties = {
  borderRadius: 20,
  border: '1px solid var(--color-border-default)',
  background: 'var(--color-surface-secondary)',
  boxShadow:
    '0 28px 45px rgba(0,0,0,0.38), 0 8px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08)',
  transform: 'perspective(1000px) rotateX(1.2deg)',
};

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 20,
  background:
    'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.2))',
  pointerEvents: 'none',
};

const inputClass =
  'w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]';

export function CopilotStudioGuide() {
  const [currentStep, setCurrentStep] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('Contoso Concierge');
  const [agentDescription, setAgentDescription] = useState(
    'Guides employees through IT requests, order tracking, and policy FAQs.',
  );
  const [agentLanguage, setAgentLanguage] = useState(languageOptions[0]);
  const [agentIcon, setAgentIcon] = useState(iconOptions[0].id);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [activeTopicId, setActiveTopicId] = useState(initialTopics[0].id);
  const [newNodeText, setNewNodeText] = useState('Provide your order number.');
  const [actionType, setActionType] = useState('Power Automate');
  const [paramMappings, setParamMappings] =
    useState<ParamMapping[]>(initialMappings);
  const [sources, setSources] = useState<KnowledgeSource[]>(initialSources);
  const [newUrl, setNewUrl] = useState('https://contoso.com/support/returns');
  const [newFile, setNewFile] = useState('WarrantyGuide.docx');
  const [newSharePoint, setNewSharePoint] = useState(
    'https://contoso.sharepoint.com/sites/it',
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChat);
  const [chatInput, setChatInput] = useState(
    'Can you also update my delivery address?',
  );
  const [channels, setChannels] = useState<string[]>(['Teams', 'Web']);

  const activeTopic = topics.find((topic) => topic.id === activeTopicId);

  const isStepValid = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return (
          agentName.trim().length > 0 &&
          agentDescription.trim().length > 0 &&
          agentLanguage.trim().length > 0 &&
          agentIcon.trim().length > 0
        );
      case 1:
        return (
          topics.length > 0 &&
          topics.every(
            (topic) =>
              topic.title.trim().length > 0 &&
              topic.triggers.trim().length > 0 &&
              topic.nodes.length > 0 &&
              topic.nodes.every((node) => node.trim().length > 0),
          )
        );
      case 2:
        return (
          actionType.trim().length > 0 &&
          paramMappings.length > 0 &&
          paramMappings.every(
            (mapping) =>
              mapping.field.trim().length > 0 &&
              mapping.source.trim().length > 0,
          )
        );
      case 3:
        return sources.length > 0;
      case 4:
        return chatMessages.length > 0;
      case 5:
        return channels.length > 0;
      default:
        return false;
    }
  };

  const getValidationMessage = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return 'Complete the agent name, description, icon, and language.';
      case 1:
        return 'Add at least one topic with triggers and message nodes.';
      case 2:
        return 'Select an action type and complete parameter mappings.';
      case 3:
        return 'Add at least one knowledge source.';
      case 4:
        return 'Seed the test chat with at least one message.';
      case 5:
        return 'Select at least one publishing channel.';
      default:
        return 'Complete the required fields before continuing.';
    }
  };

  const canNavigateTo = (index: number) => {
    for (let i = 0; i < index; i += 1) {
      if (!isStepValid(i)) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!isStepValid(currentStep)) {
      setValidationError(getValidationMessage(currentStep));
      return;
    }
    setValidationError(null);
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleStepSelect = (index: number) => {
    if (index === currentStep) return;
    if (!canNavigateTo(index)) {
      setValidationError(
        'Complete the current step before jumping ahead.',
      );
      return;
    }
    setValidationError(null);
    setCurrentStep(index);
  };

  const addTopic = () => {
    const newTopic: Topic = {
      id: `topic-${Date.now()}`,
      title: 'New topic',
      triggers: 'Add trigger phrases',
      nodes: ['Start the conversation.'],
    };
    setTopics((prev) => [...prev, newTopic]);
    setActiveTopicId(newTopic.id);
  };

  const updateTopic = (topicId: string, patch: Partial<Topic>) => {
    setTopics((prev) =>
      prev.map((topic) =>
        topic.id === topicId ? { ...topic, ...patch } : topic,
      ),
    );
  };

  const addNode = () => {
    if (!activeTopic || newNodeText.trim().length === 0) return;
    updateTopic(activeTopic.id, {
      nodes: [...activeTopic.nodes, newNodeText.trim()],
    });
    setNewNodeText('');
  };

  const addMapping = () => {
    setParamMappings((prev) => [
      ...prev,
      {
        id: `map-${Date.now()}`,
        field: 'NewField',
        source: 'conversation.value',
        required: false,
      },
    ]);
  };

  const addSource = (type: KnowledgeSource['type'], value: string) => {
    if (value.trim().length === 0) return;
    setSources((prev) => [
      ...prev,
      {
        id: `${type}-${Date.now()}`,
        type,
        value: value.trim(),
      },
    ]);
  };

  const addChatMessage = () => {
    if (chatInput.trim().length === 0) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: chatInput.trim(),
      },
    ]);
    setChatInput('');
  };

  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((item) => item !== channel)
        : [...prev, channel],
    );
  };

  const renderStepContent = () => {
    if (!activeTopic) return null;

    switch (currentStep) {
      case 0: {
        return (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                  Agent profile
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                  Define your Copilot Studio agent
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Configure the persona, iconography, and localization before
                  you design topics.
                </p>
              </div>
              <div className="grid gap-4">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  Agent name
                  <input
                    className={`${inputClass} mt-2`}
                    value={agentName}
                    onChange={(event) => setAgentName(event.target.value)}
                  />
                </label>
                <label className="text-sm text-[var(--color-text-secondary)]">
                  Description
                  <textarea
                    className={`${inputClass} mt-2 min-h-[96px] resize-none`}
                    value={agentDescription}
                    onChange={(event) => setAgentDescription(event.target.value)}
                  />
                </label>
                <label className="text-sm text-[var(--color-text-secondary)]">
                  Primary language
                  <select
                    className={`${inputClass} mt-2`}
                    value={agentLanguage}
                    onChange={(event) => setAgentLanguage(event.target.value)}
                  >
                    {languageOptions.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div
                className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                style={{
                  boxShadow:
                    '0 20px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                  transform: 'perspective(900px) rotateX(1deg)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Agent preview
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {agentName}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {agentLanguage}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                  {agentDescription}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Icon selection
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {iconOptions.map(({ id, label, Icon }) => {
                    const isSelected = agentIcon === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setAgentIcon(id)}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                          isSelected
                            ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/15 text-[var(--color-text-primary)]'
                            : 'border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                        style={{
                          boxShadow: isSelected
                            ? '0 14px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
                            : '0 10px 16px rgba(0,0,0,0.2)',
                          transform: 'perspective(700px) rotateX(1deg)',
                        }}
                      >
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 1: {
        return (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Topics
                </p>
                <button
                  type="button"
                  onClick={addTopic}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {topics.map((topic) => {
                  const isActive = topic.id === activeTopicId;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setActiveTopicId(topic.id)}
                      className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                        isActive
                          ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/15 text-[var(--color-text-primary)]'
                          : 'border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                      }`}
                      style={{
                        boxShadow:
                          '0 12px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
                        transform: 'perspective(700px) rotateX(1deg)',
                      }}
                    >
                      <p className="font-medium">{topic.title}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {topic.triggers.split(';')[0]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Topic details
                </p>
                <div className="mt-3 grid gap-4">
                  <label className="text-sm text-[var(--color-text-secondary)]">
                    Topic name
                    <input
                      className={`${inputClass} mt-2`}
                      value={activeTopic.title}
                      onChange={(event) =>
                        updateTopic(activeTopic.id, {
                          title: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="text-sm text-[var(--color-text-secondary)]">
                    Trigger phrases
                    <input
                      className={`${inputClass} mt-2`}
                      value={activeTopic.triggers}
                      onChange={(event) =>
                        updateTopic(activeTopic.id, {
                          triggers: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Message flow
                  </p>
                </div>
                <div
                  className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                  style={{
                    boxShadow:
                      '0 16px 26px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
                    transform: 'perspective(800px) rotateX(0.8deg)',
                  }}
                >
                  {activeTopic.nodes.map((node, index) => (
                    <div key={`${node}-${index}`} className="flex items-center gap-3">
                      <div
                        className="max-w-[220px] rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)]"
                        style={{
                          boxShadow:
                            '0 10px 18px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
                        }}
                      >
                        {node}
                      </div>
                      {index < activeTopic.nodes.length - 1 && (
                        <div className="flex items-center gap-2">
                          <div className="h-[2px] w-8 bg-[var(--color-border-subtle)]" />
                          <div
                            style={{
                              width: 0,
                              height: 0,
                              borderTop: '5px solid transparent',
                              borderBottom: '5px solid transparent',
                              borderLeft:
                                '8px solid var(--color-border-subtle)',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Message node editor
                </p>
                {activeTopic.nodes.map((node, index) => (
                  <label
                    key={`node-${index}`}
                    className="text-xs text-[var(--color-text-secondary)]"
                  >
                    Node {index + 1}
                    <input
                      className={`${inputClass} mt-1`}
                      value={node}
                      onChange={(event) => {
                        const updated = [...activeTopic.nodes];
                        updated[index] = event.target.value;
                        updateTopic(activeTopic.id, { nodes: updated });
                      }}
                    />
                  </label>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    className={inputClass}
                    placeholder="Add another message node"
                    value={newNodeText}
                    onChange={(event) => setNewNodeText(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addNode}
                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 2: {
        const actionOptions = [
          { label: 'Power Automate', Icon: Zap },
          { label: 'HTTP', Icon: Globe },
          { label: 'Plugin', Icon: Settings },
        ];
        return (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Action type
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {actionOptions.map(({ label, Icon }) => {
                    const isSelected = actionType === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setActionType(label)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/15 text-[var(--color-text-primary)]'
                            : 'border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                        style={{
                          boxShadow:
                            '0 12px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
                          transform: 'perspective(800px) rotateX(1deg)',
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                    Parameter mapping
                  </p>
                  <button
                    type="button"
                    onClick={addMapping}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                  >
                    <Plus className="h-3 w-3" />
                    Add row
                  </button>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border-default)]">
                  <div className="grid grid-cols-[1.2fr_1.4fr_0.6fr] bg-[var(--color-surface-tertiary)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                    <span>Parameter</span>
                    <span>Source</span>
                    <span>Required</span>
                  </div>
                  {paramMappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="grid grid-cols-[1.2fr_1.4fr_0.6fr] items-center gap-2 border-t border-[var(--color-border-subtle)] px-3 py-2"
                    >
                      <input
                        className={inputClass}
                        value={mapping.field}
                        onChange={(event) => {
                          setParamMappings((prev) =>
                            prev.map((item) =>
                              item.id === mapping.id
                                ? { ...item, field: event.target.value }
                                : item,
                            ),
                          );
                        }}
                      />
                      <input
                        className={inputClass}
                        value={mapping.source}
                        onChange={(event) => {
                          setParamMappings((prev) =>
                            prev.map((item) =>
                              item.id === mapping.id
                                ? { ...item, source: event.target.value }
                                : item,
                            ),
                          );
                        }}
                      />
                      <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <input
                          type="checkbox"
                          checked={mapping.required}
                          onChange={() =>
                            setParamMappings((prev) =>
                              prev.map((item) =>
                                item.id === mapping.id
                                  ? { ...item, required: !item.required }
                                  : item,
                              ),
                            )
                          }
                        />
                        Required
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div
                className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                style={{
                  boxShadow:
                    '0 20px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                  transform: 'perspective(900px) rotateX(1deg)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Action summary
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {actionType} action
                    </h3>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  Map conversation data into downstream automation with
                  validation and required fields.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Automation checklist
                </p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <li>Flow owner: IT Operations</li>
                  <li>Retry policy: 3 attempts</li>
                  <li>Timeout: 45 seconds</li>
                </ul>
              </div>
            </div>
          </div>
        );
      }
      case 3: {
        const sourceIcon = (type: KnowledgeSource['type']) => {
          if (type === 'url') return <Link className="h-4 w-4" />;
          if (type === 'file') return <FileText className="h-4 w-4" />;
          return <BookOpen className="h-4 w-4" />;
        };
        return (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="flex flex-col gap-4">
              <div className="grid gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Add knowledge sources
                </p>
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      value={newUrl}
                      onChange={(event) => setNewUrl(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addSource('url', newUrl);
                        setNewUrl('');
                      }}
                      className="inline-flex h-10 items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    >
                      <Plus className="h-4 w-4" />
                      URL
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      value={newFile}
                      onChange={(event) => setNewFile(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addSource('file', newFile);
                        setNewFile('');
                      }}
                      className="inline-flex h-10 items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    >
                      <Plus className="h-4 w-4" />
                      File
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      value={newSharePoint}
                      onChange={(event) => setNewSharePoint(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addSource('sharepoint', newSharePoint);
                        setNewSharePoint('');
                      }}
                      className="inline-flex h-10 items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    >
                      <Plus className="h-4 w-4" />
                      SharePoint
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Connected sources
                </p>
                <div className="grid gap-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
                      style={{
                        boxShadow:
                          '0 12px 18px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)]">
                          {sourceIcon(source.type)}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                            {source.type}
                          </p>
                          <p className="text-sm text-[var(--color-text-primary)]">
                            {source.value}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Indexed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div
                className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                style={{
                  boxShadow:
                    '0 20px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                  transform: 'perspective(900px) rotateX(1deg)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Grounding summary
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      Knowledge coverage
                    </h3>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  Sources are tagged, indexed, and ready for retrieval across
                  the selected topics.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Retrieval hints
                </p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <li>Prioritize SharePoint policies for HR topics.</li>
                  <li>Fallback to support URLs when file data is stale.</li>
                  <li>Refresh indexing every 24 hours.</li>
                </ul>
              </div>
            </div>
          </div>
        );
      }
      case 4: {
        return (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-4">
              <div
                className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4"
                style={{
                  boxShadow:
                    '0 20px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                  transform: 'perspective(900px) rotateX(1deg)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]">
                    <TestTube className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Test session
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      Simulated Copilot chat
                    </h3>
                  </div>
                </div>
                <div className="mt-4 space-y-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] p-3">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-3 py-2 text-xs ${
                          message.role === 'user'
                            ? 'bg-[var(--color-accent-primary)]/20 text-[var(--color-text-primary)]'
                            : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
                        }`}
                        style={{
                          boxShadow:
                            '0 10px 18px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
                        }}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    className={inputClass}
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addChatMessage}
                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                  >
                    <Plus className="h-4 w-4" />
                    Send
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Test observations
                  </p>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <li>Intent recognized: shipment tracking.</li>
                  <li>Fallback enabled for missing ZIP code.</li>
                  <li>Escalation flow triggered on address changes.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Diagnostics
                </p>
                <div className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <p>Response latency: 420 ms</p>
                  <p>Grounded sources: 3</p>
                  <p>Automation calls: 1</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 5: {
        const channelOptions = ['Teams', 'Web', 'Custom'];
        const checklist = [
          'Admin consent granted',
          'Environment variables configured',
          'Data loss prevention policy verified',
          'Telemetry enabled',
        ];
        return (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Publishing channels
                </p>
                <div className="mt-3 grid gap-2">
                  {channelOptions.map((channel) => (
                    <label
                      key={channel}
                      className="flex items-center justify-between rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
                      style={{
                        boxShadow:
                          '0 12px 18px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
                      }}
                    >
                      <span>{channel}</span>
                      <input
                        type="checkbox"
                        checked={channels.includes(channel)}
                        onChange={() => toggleChannel(channel)}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Deployment checklist
                </p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                  {checklist.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-status-success)]/15 text-[var(--color-status-success)]">
                        <Check className="h-3 w-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div
                className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                style={{
                  boxShadow:
                    '0 20px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                  transform: 'perspective(900px) rotateX(1deg)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Ready to launch
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      Publish the agent
                    </h3>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  Selected channels will be updated once you confirm the release
                  checklist.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Release window
                </p>
                <div className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <p>Teams rollout: 09:00 AM</p>
                  <p>Web embed: 10:30 AM</p>
                  <p>Custom endpoints: 12:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-auto bg-[var(--color-surface-primary)] p-6 text-[var(--color-text-primary)]">
      <header
        className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
        style={baseCardStyle}
      >
        <div style={overlayStyle} />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                Copilot Studio builder
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                Interactive guide to building agents
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Follow the wizard to configure, test, and publish a Copilot
                Studio agent with realistic sample data.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-xs text-[var(--color-text-secondary)] lg:flex">
              <BookOpen className="h-4 w-4" />
              Step-by-step mode
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-6">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep && isStepValid(index);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepSelect(index)}
                  className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-xs transition-colors ${
                    isActive
                      ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/15 text-[var(--color-text-primary)]'
                      : 'border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                  style={{
                    boxShadow:
                      '0 14px 22px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
                    transform: 'perspective(800px) rotateX(1deg)',
                  }}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold ${
                      isActive
                        ? 'bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]'
                        : isCompleted
                          ? 'bg-[var(--color-status-success)]/20 text-[var(--color-status-success)]'
                          : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]'
                    }`}
                    style={{
                      boxShadow:
                        '0 8px 14px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {step.title}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {step.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <section
        className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-6"
        style={baseCardStyle}
      >
        <div style={overlayStyle} />
        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]">
                {(() => {
                  const Icon = steps[currentStep].Icon;
                  return <Icon className="h-5 w-5" />;
                })()}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Step {currentStep + 1} of {steps.length}
                </p>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {steps[currentStep].title}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/20 px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-accent-primary)]/30"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {validationError && (
            <div className="rounded-lg border border-[var(--color-status-error)]/40 bg-[var(--color-status-error)]/10 px-3 py-2 text-sm text-[var(--color-status-error)]">
              {validationError}
            </div>
          )}

          {renderStepContent()}
        </div>
      </section>
    </div>
  );
}
