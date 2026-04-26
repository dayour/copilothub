// ---------------------------------------------------------------------------
// graphClient.ts -- Foundational Microsoft Graph client for CopilotHub
// Uses the existing Entra auth facade to acquire delegated access tokens and
// exposes a typed, fetch-based API for core Microsoft 365 data.
// ---------------------------------------------------------------------------

import entraAuth from './entraAuth';

export const GRAPH_DEFAULT_SCOPE = 'https://graph.microsoft.com/.default';
const GRAPH_DEFAULT_BASE_URL = 'https://graph.microsoft.com/v1.0/';
const DEFAULT_PAGE_SIZE = 10;

export interface GraphAuthProvider {
  getAccessToken(scope?: string): Promise<string | null>;
}

export type GraphClientErrorCode =
  | 'auth_required'
  | 'insufficient_scope'
  | 'throttled'
  | 'not_found'
  | 'network_error'
  | 'aborted'
  | 'service_error'
  | 'http_error'
  | 'unsupported_feature'
  | 'invalid_response';

export interface GraphClientErrorOptions {
  status?: number;
  requestId?: string | null;
  retryAfterSeconds?: number | null;
  details?: unknown;
  cause?: unknown;
}

export class GraphClientError extends Error {
  public readonly code: GraphClientErrorCode;
  public readonly status?: number;
  public readonly requestId?: string | null;
  public readonly retryAfterSeconds?: number | null;
  public readonly details?: unknown;
  public readonly cause?: unknown;

  constructor(code: GraphClientErrorCode, message: string, options: GraphClientErrorOptions = {}) {
    super(message);
    this.name = 'GraphClientError';
    this.code = code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export function isGraphClientError(error: unknown): error is GraphClientError {
  return error instanceof GraphClientError;
}

export interface GraphCollectionResponse<T> {
  value: T[];
  nextLink?: string;
  deltaLink?: string;
  context?: string;
}

export interface GraphIdentity {
  id?: string;
  displayName?: string;
  userPrincipalName?: string;
}

export interface GraphRecipient {
  emailAddress?: GraphIdentity;
}

export interface GraphDateTimeTimeZone {
  dateTime: string;
  timeZone?: string;
}

export interface GraphUserProfile {
  id: string;
  displayName?: string;
  userPrincipalName?: string;
  mail?: string | null;
  givenName?: string | null;
  surname?: string | null;
  jobTitle?: string | null;
  mobilePhone?: string | null;
  businessPhones?: string[];
  officeLocation?: string | null;
  preferredLanguage?: string | null;
}

export interface GraphCalendarEvent {
  id: string;
  subject?: string;
  webLink?: string;
  isAllDay?: boolean;
  start?: GraphDateTimeTimeZone;
  end?: GraphDateTimeTimeZone;
  location?: {
    displayName?: string;
  };
  organizer?: GraphRecipient;
}

export interface GraphDriveItem {
  id: string;
  name?: string;
  webUrl?: string;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
  size?: number;
  file?: Record<string, unknown>;
  folder?: Record<string, unknown>;
  remoteItem?: Record<string, unknown>;
}

export interface GraphMailMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime?: string;
  sentDateTime?: string;
  isRead?: boolean;
  importance?: string;
  webLink?: string;
  from?: GraphRecipient;
  sender?: GraphRecipient;
}

export interface GraphChatMessage {
  id: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  webUrl?: string;
  messageType?: string;
  subject?: string | null;
  from?: {
    user?: {
      displayName?: string;
      id?: string;
      userIdentityType?: string;
    };
  };
  body?: {
    contentType?: string;
    content?: string;
  };
}

interface GraphApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    innerError?: Record<string, unknown>;
  };
}

type GraphFetch = typeof fetch;
type GraphQueryValue = string | number | boolean | null | undefined | Array<string | number | boolean>;

interface GraphRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, GraphQueryValue>;
  headers?: HeadersInit;
  body?: unknown;
  signal?: AbortSignal;
  scope?: string;
}

export interface GraphClientOptions {
  auth?: GraphAuthProvider;
  fetch?: GraphFetch;
  baseUrl?: string;
  defaultScope?: string;
  defaultPageSize?: number;
}

export interface GraphListOptions {
  top?: number;
  signal?: AbortSignal;
}

export interface GraphCalendarEventsOptions extends GraphListOptions {
  orderBy?: string[];
}

export interface GraphMailMessagesOptions extends GraphListOptions {
  unreadOnly?: boolean;
}

export interface GraphChatMessagesOptions extends GraphListOptions {}

export interface GraphRequestExecutionOptions {
  signal?: AbortSignal;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function normalizeCollectionResponse<T>(payload: unknown): GraphCollectionResponse<T> {
  if (typeof payload !== 'object' || payload === null) {
    throw new GraphClientError('invalid_response', 'Microsoft Graph returned an invalid collection payload.', {
      details: payload,
    });
  }

  const record = payload as Record<string, unknown>;
  if (!Array.isArray(record.value)) {
    throw new GraphClientError('invalid_response', 'Microsoft Graph collection payload did not include a value array.', {
      details: payload,
    });
  }

  return {
    value: record.value as T[],
    nextLink: typeof record['@odata.nextLink'] === 'string' ? record['@odata.nextLink'] : undefined,
    deltaLink: typeof record['@odata.deltaLink'] === 'string' ? record['@odata.deltaLink'] : undefined,
    context: typeof record['@odata.context'] === 'string' ? record['@odata.context'] : undefined,
  };
}

function getRetryAfterSeconds(headers: Headers): number | null {
  const value = headers.get('Retry-After');
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) {
    return null;
  }

  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}

function getRequestId(headers: Headers, payload?: GraphApiErrorPayload): string | null {
  const headerRequestId = headers.get('request-id') ?? headers.get('client-request-id');
  if (headerRequestId) {
    return headerRequestId;
  }

  const innerError = payload?.error?.innerError;
  if (innerError && typeof innerError['request-id'] === 'string') {
    return innerError['request-id'];
  }

  return null;
}

function mapHttpError(response: Response, payload?: GraphApiErrorPayload, rawBody?: string): GraphClientError {
  const graphMessage = payload?.error?.message;
  const fallbackMessage = rawBody && rawBody.trim().length > 0
    ? rawBody
    : `Microsoft Graph request failed (${response.status} ${response.statusText})`;
  const message = graphMessage ?? fallbackMessage;
  const requestId = getRequestId(response.headers, payload);
  const retryAfterSeconds = getRetryAfterSeconds(response.headers);

  switch (response.status) {
    case 401:
      return new GraphClientError('auth_required', message, {
        status: response.status,
        requestId,
        details: payload,
      });
    case 403:
      return new GraphClientError('insufficient_scope', message, {
        status: response.status,
        requestId,
        details: payload,
      });
    case 404:
      return new GraphClientError('not_found', message, {
        status: response.status,
        requestId,
        details: payload,
      });
    case 429:
      return new GraphClientError('throttled', message, {
        status: response.status,
        requestId,
        retryAfterSeconds,
        details: payload,
      });
    default:
      if (response.status >= 500) {
        return new GraphClientError('service_error', message, {
          status: response.status,
          requestId,
          details: payload,
        });
      }

      return new GraphClientError('http_error', message, {
        status: response.status,
        requestId,
        details: payload,
      });
  }
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, GraphQueryValue>): string {
  const url = new URL(path.replace(/^\//, ''), normalizeBaseUrl(baseUrl));

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        url.searchParams.set(key, value.join(','));
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

interface ParsedJsonPayload<T> {
  payload?: T;
  rawBody?: string;
  parseError?: unknown;
}

async function parseJsonPayload<T>(response: Response): Promise<ParsedJsonPayload<T>> {
  if (response.status === 204) {
    return {};
  }

  const rawBody = await response.text();
  if (rawBody.length === 0) {
    return { rawBody };
  }

  try {
    return {
      payload: JSON.parse(rawBody) as T,
      rawBody,
    };
  } catch (error) {
    return {
      rawBody,
      parseError: error,
    };
  }
}

export class GraphClient {
  private readonly auth: GraphAuthProvider;
  private readonly fetchImpl: GraphFetch;
  private readonly baseUrl: string;
  private readonly defaultScope: string;
  private readonly defaultPageSize: number;

  constructor(options: GraphClientOptions = {}) {
    this.auth = options.auth ?? entraAuth;
    this.fetchImpl = options.fetch ?? fetch;
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? GRAPH_DEFAULT_BASE_URL);
    this.defaultScope = options.defaultScope ?? GRAPH_DEFAULT_SCOPE;
    this.defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  }

  private async request<T>(path: string, options: GraphRequestOptions = {}): Promise<T> {
    const accessToken = await this.auth.getAccessToken(options.scope ?? this.defaultScope);
    if (!accessToken) {
      throw new GraphClientError(
        'auth_required',
        'Microsoft Graph access requires a valid Entra access token. Sign in and retry.',
      );
    }

    const url = buildUrl(this.baseUrl, path, options.query);

    try {
      const response = await this.fetchImpl(url, {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      });

      const { payload, rawBody, parseError } = await parseJsonPayload<T & GraphApiErrorPayload>(response);
      if (!response.ok) {
        throw mapHttpError(response, payload, rawBody);
      }

      if (parseError) {
        throw new GraphClientError('invalid_response', 'Microsoft Graph returned malformed JSON.', {
          status: response.status,
          details: rawBody,
          cause: parseError,
        });
      }

      if (payload === undefined) {
        throw new GraphClientError('invalid_response', 'Microsoft Graph returned an empty response body.', {
          status: response.status,
        });
      }

      return payload;
    } catch (error) {
      if (isGraphClientError(error)) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new GraphClientError('aborted', 'Microsoft Graph request was aborted.', { cause: error });
      }

      throw new GraphClientError(
        'network_error',
        `Microsoft Graph request failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  public async getMe(options: GraphRequestExecutionOptions = {}): Promise<GraphUserProfile> {
    return this.request<GraphUserProfile>('me', {
      signal: options.signal,
      query: {
        '$select': [
          'id',
          'displayName',
          'userPrincipalName',
          'mail',
          'givenName',
          'surname',
          'jobTitle',
          'mobilePhone',
          'businessPhones',
          'officeLocation',
          'preferredLanguage',
        ],
      },
    });
  }

  public async listCalendarEvents(options: GraphCalendarEventsOptions = {}): Promise<GraphCollectionResponse<GraphCalendarEvent>> {
    const payload = await this.request<GraphCollectionResponse<GraphCalendarEvent>>('me/events', {
      query: {
        '$top': options.top ?? this.defaultPageSize,
        '$select': [
          'id',
          'subject',
          'webLink',
          'isAllDay',
          'start',
          'end',
          'location',
          'organizer',
        ],
        '$orderby': options.orderBy ?? ['start/dateTime'],
      },
      signal: options.signal,
    });

    return normalizeCollectionResponse<GraphCalendarEvent>(payload);
  }

  public async listRecentDriveFiles(options: GraphListOptions = {}): Promise<GraphCollectionResponse<GraphDriveItem>> {
    const payload = await this.request<GraphCollectionResponse<GraphDriveItem>>('me/drive/recent', {
      query: {
        '$top': options.top ?? this.defaultPageSize,
      },
      signal: options.signal,
    });

    return normalizeCollectionResponse<GraphDriveItem>(payload);
  }

  public async listMailMessages(options: GraphMailMessagesOptions = {}): Promise<GraphCollectionResponse<GraphMailMessage>> {
    const filters = options.unreadOnly ? ['isRead eq false'] : undefined;
    const payload = await this.request<GraphCollectionResponse<GraphMailMessage>>('me/messages', {
      query: {
        '$top': options.top ?? this.defaultPageSize,
        '$select': [
          'id',
          'subject',
          'bodyPreview',
          'receivedDateTime',
          'sentDateTime',
          'isRead',
          'importance',
          'webLink',
          'from',
          'sender',
        ],
        '$orderby': ['receivedDateTime desc'],
        '$filter': filters,
      },
      signal: options.signal,
    });

    return normalizeCollectionResponse<GraphMailMessage>(payload);
  }

  public async listChatMessages(chatId: string, options: GraphChatMessagesOptions = {}): Promise<GraphCollectionResponse<GraphChatMessage>> {
    if (!chatId || chatId.trim().length === 0) {
      throw new GraphClientError('unsupported_feature', 'A Microsoft Teams chat ID is required to list chat messages.');
    }

    const payload = await this.request<GraphCollectionResponse<GraphChatMessage>>(
      `me/chats/${encodeURIComponent(chatId)}/messages`,
        {
          query: {
            '$top': options.top ?? this.defaultPageSize,
          },
          signal: options.signal,
        },
      );

    return normalizeCollectionResponse<GraphChatMessage>(payload);
  }
}

export function createGraphClient(options?: GraphClientOptions): GraphClient {
  return new GraphClient(options);
}

const graphClient = createGraphClient();
export default graphClient;
