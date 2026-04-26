import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GraphClient,
  GraphClientError,
  type GraphAuthProvider,
} from './graphClient';

describe('GraphClient', () => {
  let auth: GraphAuthProvider;
  let getAccessTokenMock: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getAccessTokenMock = vi.fn().mockResolvedValue('graph-token');
    auth = {
      getAccessToken: getAccessTokenMock,
    };

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function expectCalledUrl(
    urlValue: unknown,
    expectedPath: string,
    expectedQuery: Record<string, string>,
  ): void {
    expect(typeof urlValue).toBe('string');
    const url = new URL(urlValue as string);
    expect(url.origin).toBe('https://graph.microsoft.com');
    expect(url.pathname).toBe(expectedPath);

    for (const [key, value] of Object.entries(expectedQuery)) {
      expect(url.searchParams.get(key)).toBe(value);
    }
  }

  it('requests a token before calling Microsoft Graph', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'user-1',
          displayName: 'Adele Vance',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const client = new GraphClient({ auth, fetch: fetchMock });
    await client.getMe();

    expect(getAccessTokenMock).toHaveBeenCalledWith('https://graph.microsoft.com/.default');
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [unknown, RequestInit];
    expectCalledUrl(requestUrl, '/v1.0/me', {
      '$select':
        'id,displayName,userPrincipalName,mail,givenName,surname,jobTitle,mobilePhone,businessPhones,officeLocation,preferredLanguage',
    });
    expect(requestInit).toEqual(
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer graph-token',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('passes AbortSignal through to fetch requests', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'user-1',
          displayName: 'Adele Vance',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const abortController = new AbortController();
    const client = new GraphClient({ auth, fetch: fetchMock });

    await client.getMe({ signal: abortController.signal });

    const [, requestInit] = fetchMock.mock.calls[0] as [unknown, RequestInit];
    expect(requestInit.signal).toBe(abortController.signal);
  });

  it('throws auth_required when the auth layer has no access token', async () => {
    getAccessTokenMock.mockResolvedValue(null);
    const client = new GraphClient({ auth, fetch: fetchMock });

    await expect(client.getMe()).rejects.toMatchObject<Partial<GraphClientError>>({
      code: 'auth_required',
      message: expect.stringContaining('valid Entra access token'),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('builds calendar and drive requests with pragmatic defaults', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    const client = new GraphClient({ auth, fetch: fetchMock });

    await client.listCalendarEvents({ top: 5 });
    await client.listRecentDriveFiles();

    expectCalledUrl(fetchMock.mock.calls[0]?.[0], '/v1.0/me/events', {
      '$top': '5',
      '$select': 'id,subject,webLink,isAllDay,start,end,location,organizer',
      '$orderby': 'start/dateTime',
    });
    expectCalledUrl(fetchMock.mock.calls[1]?.[0], '/v1.0/me/drive/recent', {
      '$top': '10',
    });
  });

  it('maps 403 responses to insufficient_scope errors', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'ErrorAccessDenied',
            message: 'The caller does not have permission to perform the action.',
          },
        }),
        {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'Content-Type': 'application/json', 'request-id': 'req-403' },
        },
      ),
    );

    const client = new GraphClient({ auth, fetch: fetchMock });

    await expect(client.listMailMessages()).rejects.toMatchObject<Partial<GraphClientError>>({
      code: 'insufficient_scope',
      status: 403,
      requestId: 'req-403',
      message: 'The caller does not have permission to perform the action.',
    });
  });

  it('maps throttling responses with retry metadata', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'TooManyRequests',
            message: 'Please retry later.',
          },
        }),
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '15',
            'request-id': 'req-429',
          },
        },
      ),
    );

    const client = new GraphClient({ auth, fetch: fetchMock });

    await expect(client.listMailMessages()).rejects.toMatchObject<Partial<GraphClientError>>({
      code: 'throttled',
      status: 429,
      retryAfterSeconds: 15,
      requestId: 'req-429',
    });
  });

  it('preserves HTTP error classification for non-JSON error payloads', async () => {
    fetchMock.mockResolvedValue(
      new Response('Gateway unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      }),
    );

    const client = new GraphClient({ auth, fetch: fetchMock });

    await expect(client.listMailMessages()).rejects.toMatchObject<Partial<GraphClientError>>({
      code: 'service_error',
      status: 503,
      message: 'Gateway unavailable',
    });
  });

  it('maps aborts and network failures to explicit client errors', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError')).mockRejectedValueOnce(new TypeError('offline'));

    const client = new GraphClient({ auth, fetch: fetchMock });

    await expect(client.getMe()).rejects.toMatchObject<Partial<GraphClientError>>({
      code: 'aborted',
      message: 'Microsoft Graph request was aborted.',
    });

    await expect(client.getMe()).rejects.toMatchObject<Partial<GraphClientError>>({
      code: 'network_error',
      message: 'Microsoft Graph request failed: offline',
    });
  });

  it('validates chat message requests require a chat id', async () => {
    const client = new GraphClient({ auth, fetch: fetchMock });

    await expect(client.listChatMessages('   ')).rejects.toMatchObject<Partial<GraphClientError>>({
      code: 'unsupported_feature',
      message: expect.stringContaining('chat ID is required'),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
