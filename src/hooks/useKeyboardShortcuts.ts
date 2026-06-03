import { useEffect } from 'react';
import { useTabStore } from '../store/tabStore';
import { useAppStore } from '../store/appStore';
import { followMeRecorder } from '../lib/followMeRecorder';
import mcpClient from '../lib/mcpClient';

export function useKeyboardShortcuts(
  onAddProject?: () => void | Promise<void>,
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const tabStore = useTabStore.getState();
      const appStore = useAppStore.getState();
      const activeTab = tabStore.activeTab();

      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key;
      const keyLower = key.toLowerCase();

      if (isCtrl && keyLower === 't' && !e.shiftKey) {
        e.preventDefault();
        tabStore.addTab('browser');
        return;
      }

      if (isCtrl && keyLower === 'w' && !e.shiftKey) {
        e.preventDefault();
        if (activeTab) {
          tabStore.closeTab(activeTab.id);
        }
        return;
      }

      if (isCtrl && keyLower === 'o' && !e.shiftKey) {
        e.preventDefault();
        void onAddProject?.();
        return;
      }

      if (isCtrl && key === ',' && !e.shiftKey) {
        e.preventDefault();
        appStore.toggleSettingsPanel();
        return;
      }

      if (isCtrl && e.shiftKey && keyLower === 'e') {
        e.preventDefault();
        appStore.toggleVerticalTabs();
        return;
      }

      if (isCtrl && e.shiftKey && keyLower === 'p') {
        e.preventDefault();
        appStore.toggleCommandPalette();
        return;
      }

      if (isCtrl && e.shiftKey && keyLower === 'c') {
        e.preventDefault();
        const chatTab = tabStore.tabs.find((t) => t.type === 'chat');
        if (chatTab) {
          tabStore.setActiveTab(chatTab.id);
        }
        return;
      }

      if (isCtrl && e.code === 'Backquote') {
        e.preventDefault();
        const terminalTab = tabStore.tabs.find((t) => t.type === 'terminal');
        if (terminalTab) {
          tabStore.setActiveTab(terminalTab.id);
        } else {
          tabStore.addTab('terminal');
        }
        return;
      }

      if (key === 'F5') {
        e.preventDefault();
        if (activeTab?.type === 'browser') {
          tabStore.requestTabReload(activeTab.id);
        }
        return;
      }

      if (isCtrl && key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        if (tabStore.tabs.length > 1 && activeTab) {
          const currentIndex = tabStore.tabs.findIndex((t) => t.id === activeTab.id);
          if (currentIndex !== -1) {
            const nextIndex =
              ((currentIndex + 1) % tabStore.tabs.length + tabStore.tabs.length) %
              tabStore.tabs.length;
            if (nextIndex >= 0 && nextIndex < tabStore.tabs.length) {
              tabStore.setActiveTab(tabStore.tabs[nextIndex].id);
            }
          }
        }
        return;
      }

      if (isCtrl && e.shiftKey && key === 'Tab') {
        e.preventDefault();
        if (tabStore.tabs.length > 1 && activeTab) {
          const currentIndex = tabStore.tabs.findIndex((t) => t.id === activeTab.id);
          if (currentIndex !== -1) {
            const prevIndex =
              ((currentIndex - 1) % tabStore.tabs.length + tabStore.tabs.length) %
              tabStore.tabs.length;
            if (prevIndex >= 0 && prevIndex < tabStore.tabs.length) {
              tabStore.setActiveTab(tabStore.tabs[prevIndex].id);
            }
          }
        }
        return;
      }

      if (isCtrl && !e.shiftKey && key >= '1' && key <= '9') {
        e.preventDefault();
        const targetIndex = Number.parseInt(key, 10) - 1;
        const targetTab = tabStore.tabs[targetIndex];
        if (targetTab) {
          tabStore.setActiveTab(targetTab.id);
        }
        return;
      }

      // Browser Use shortcuts

      if (isCtrl && e.shiftKey && keyLower === 'b') {
        e.preventDefault();
        appStore.setActionTimelineDocked(appStore.actionTimelineDocked === 'hidden' ? 'right' : 'hidden');
        return;
      }

      if (isCtrl && e.shiftKey && keyLower === 'r') {
        e.preventDefault();
        appStore.toggleReviewPane();
        return;
      }

      if (isCtrl && e.altKey && keyLower === 'r') {
        e.preventDefault();
        if (followMeRecorder.isRecording()) {
          followMeRecorder.stopRecording();
        } else {
          followMeRecorder.startRecording();
        }
        return;
      }

      if (isCtrl && e.shiftKey && keyLower === 's') {
        e.preventDefault();
        mcpClient.screenshot();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onAddProject]);
}
