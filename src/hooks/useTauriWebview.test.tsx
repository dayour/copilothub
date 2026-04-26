import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCallback, useRef } from 'react';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

vi.mock('../lib/tauri', () => ({
  isTauri: true,
}));

import { useTauriWebview } from './useTauriWebview';

type RectConfig = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const DEFAULT_RECT: RectConfig = {
  left: 40,
  top: 24,
  width: 1024,
  height: 768,
};

function makeDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

class MockResizeObserver {
  public observe = vi.fn();
  public disconnect = vi.fn();

  public constructor(private readonly callback: ResizeObserverCallback) {}

  public trigger() {
    this.callback([] as ResizeObserverEntry[], this as unknown as ResizeObserver);
  }
}

function toDomRect(rect: RectConfig): DOMRect {
  return {
    x: rect.left,
    y: rect.top,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => ({}),
  } as DOMRect;
}

function HookHarness({
  tabId = 'tab-1',
  url,
  isActive,
  rect = DEFAULT_RECT,
}: {
  tabId?: string;
  url: string;
  isActive: boolean;
  rect?: RectConfig;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;

      if (node) {
        Object.defineProperty(node, 'getBoundingClientRect', {
          configurable: true,
          value: () => toDomRect(rect),
        });
      }
    },
    [rect],
  );

  useTauriWebview(tabId, url, isActive, containerRef);

  return <div ref={setContainerRef} data-testid="tauri-webview-container" />;
}

describe('useTauriWebview', () => {
  let resizeObservers: MockResizeObserver[] = [];
  let rafCallback: FrameRequestCallback | null = null;

  beforeEach(() => {
    resizeObservers = [];
    rafCallback = null;
    vi.clearAllMocks();
    invokeMock.mockResolvedValue(undefined);

    class ResizeObserverStub {
      public observe = vi.fn();
      public disconnect = vi.fn();
      private readonly observer: MockResizeObserver;

      public constructor(callback: ResizeObserverCallback) {
        this.observer = new MockResizeObserver(callback);
        this.observe = this.observer.observe;
        this.disconnect = this.observer.disconnect;
        resizeObservers.push(this.observer);
      }
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverStub);

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        rafCallback = callback;
        return 1;
      }),
    );

    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates once and navigates to the latest queued URL after creation resolves', async () => {
    const createDeferred = makeDeferred<void>();
    invokeMock.mockImplementation((command: string) => {
      if (command === 'browser_create') {
        return createDeferred.promise;
      }

      return Promise.resolve(undefined);
    });

    const view = render(<HookHarness tabId="alpha" url="https://first.example" isActive />);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        'browser_create',
        expect.objectContaining({
          label: 'browser-alpha',
          url: 'https://first.example',
          x: DEFAULT_RECT.left,
          y: DEFAULT_RECT.top,
          width: DEFAULT_RECT.width,
          height: DEFAULT_RECT.height,
        }),
      );
    });

    view.rerender(<HookHarness tabId="alpha" url="https://second.example" isActive />);

    expect(invokeMock.mock.calls.map(([command]: [string]) => command)).toEqual(['browser_create']);

    await act(async () => {
      createDeferred.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('browser_navigate', {
        label: 'browser-alpha',
        url: 'https://second.example',
      });
    });

    expect(invokeMock.mock.calls.map(([command]: [string]) => command)).toEqual([
      'browser_create',
      'browser_navigate',
    ]);
  });

  it('closes the native webview when an in-flight creation is unmounted and suppresses stale navigation', async () => {
    const createDeferred = makeDeferred<void>();
    invokeMock.mockImplementation((command: string) => {
      if (command === 'browser_create') {
        return createDeferred.promise;
      }

      return Promise.resolve(undefined);
    });

    const view = render(<HookHarness tabId="beta" url="https://stale.example" isActive />);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        'browser_create',
        expect.objectContaining({
          label: 'browser-beta',
        }),
      );
    });

    view.unmount();

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('browser_close', {
        label: 'browser-beta',
      });
    });

    await act(async () => {
      createDeferred.resolve();
      await Promise.resolve();
    });

    expect(invokeMock.mock.calls.map(([command]: [string]) => command)).toEqual([
      'browser_create',
      'browser_close',
      'browser_close',
    ]);
    expect(invokeMock.mock.calls.some(([command]: [string]) => command === 'browser_navigate')).toBe(false);
  });

  it('keeps inactive webviews hidden until activation resizes and shows them', async () => {
    const view = render(<HookHarness tabId="gamma" url="https://editor.example" isActive={false} />);

    await waitFor(() => {
      expect(invokeMock.mock.calls.map(([command]: [string]) => command)).toEqual([
        'browser_create',
        'browser_hide',
      ]);
    });

    view.rerender(<HookHarness tabId="gamma" url="https://editor.example" isActive />);

    expect(rafCallback).not.toBeNull();
    expect(invokeMock.mock.calls.map(([command]: [string]) => command)).toEqual([
      'browser_create',
      'browser_hide',
    ]);

    await act(async () => {
      rafCallback?.(0);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(invokeMock.mock.calls.map(([command]: [string]) => command)).toEqual([
        'browser_create',
        'browser_hide',
        'browser_resize',
        'browser_show',
      ]);
    });

    act(() => {
      resizeObservers.at(-1)?.trigger();
    });

    await waitFor(() => {
      expect(invokeMock.mock.calls.map(([command]: [string]) => command)).toEqual([
        'browser_create',
        'browser_hide',
        'browser_resize',
        'browser_show',
        'browser_resize',
      ]);
    });

    expect(invokeMock).toHaveBeenLastCalledWith('browser_resize', {
      label: 'browser-gamma',
      x: DEFAULT_RECT.left,
      y: DEFAULT_RECT.top,
      width: DEFAULT_RECT.width,
      height: DEFAULT_RECT.height,
    });
  });
});
