// ---------------------------------------------------------------------------
// edgeImport.ts -- Utilities for importing bookmarks from Microsoft Edge
// Reads the Edge Bookmarks JSON file via Tauri filesystem APIs.
// ---------------------------------------------------------------------------

export interface EdgeBookmarkNode {
  type: 'url' | 'folder';
  name: string;
  url?: string;
  children?: EdgeBookmarkNode[];
}

export interface EdgeBookmarksFile {
  roots: {
    bookmark_bar: { children: EdgeBookmarkNode[] };
    other: { children: EdgeBookmarkNode[] };
    synced: { children: EdgeBookmarkNode[] };
  };
}

export interface ImportableFolder {
  name: string;
  bookmarks: { title: string; url: string }[];
  children: ImportableFolder[];
}

// ---------------------------------------------------------------------------
// Edge bookmarks file path
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Edge bookmarks file path (Tauri only -- no process.env dependency)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Tauri-based reader
// ---------------------------------------------------------------------------

async function readEdgeBookmarksTauri(): Promise<EdgeBookmarksFile> {
  const { readTextFile } = await import('@tauri-apps/plugin-fs');
  const { homeDir, join } = await import('@tauri-apps/api/path');

  const home = await homeDir();
  const bookmarksPath = await join(
    home,
    'AppData',
    'Local',
    'Microsoft',
    'Edge',
    'User Data',
    'Default',
    'Bookmarks',
  );

  const content = await readTextFile(bookmarksPath);
  return JSON.parse(content) as EdgeBookmarksFile;
}

// ---------------------------------------------------------------------------
// Parse bookmark tree into importable folders
// ---------------------------------------------------------------------------

function processNode(node: EdgeBookmarkNode): ImportableFolder | null {
  if (node.type !== 'folder' || !node.children) return null;

  const folder: ImportableFolder = {
    name: node.name,
    bookmarks: [],
    children: [],
  };

  for (const child of node.children) {
    if (child.type === 'url' && child.url) {
      folder.bookmarks.push({ title: child.name, url: child.url });
    } else if (child.type === 'folder') {
      const sub = processNode(child);
      if (sub) folder.children.push(sub);
    }
  }

  return folder;
}

function extractFolders(data: EdgeBookmarksFile): ImportableFolder[] {
  const result: ImportableFolder[] = [];

  // Bookmark bar
  const bar: ImportableFolder = {
    name: 'Bookmarks Bar',
    bookmarks: [],
    children: [],
  };
  for (const child of data.roots.bookmark_bar.children) {
    if (child.type === 'url' && child.url) {
      bar.bookmarks.push({ title: child.name, url: child.url });
    } else if (child.type === 'folder') {
      const sub = processNode(child);
      if (sub) bar.children.push(sub);
    }
  }
  if (bar.bookmarks.length > 0 || bar.children.length > 0) {
    result.push(bar);
  }

  // Other bookmarks
  const other: ImportableFolder = {
    name: 'Other Bookmarks',
    bookmarks: [],
    children: [],
  };
  for (const child of data.roots.other.children) {
    if (child.type === 'url' && child.url) {
      other.bookmarks.push({ title: child.name, url: child.url });
    } else if (child.type === 'folder') {
      const sub = processNode(child);
      if (sub) other.children.push(sub);
    }
  }
  if (other.bookmarks.length > 0 || other.children.length > 0) {
    result.push(other);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Flatten folder tree for selection UI
// ---------------------------------------------------------------------------

export function flattenFolders(
  folders: ImportableFolder[],
  prefix = '',
): { path: string; folder: ImportableFolder; depth: number }[] {
  const result: { path: string; folder: ImportableFolder; depth: number }[] = [];
  const depth = prefix ? prefix.split(' / ').length : 0;

  for (const folder of folders) {
    const path = prefix ? `${prefix} / ${folder.name}` : folder.name;
    result.push({ path, folder, depth });
    if (folder.children.length > 0) {
      result.push(...flattenFolders(folder.children, path));
    }
  }

  return result;
}

function countBookmarks(folder: ImportableFolder): number {
  let count = folder.bookmarks.length;
  for (const child of folder.children) {
    count += countBookmarks(child);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface EdgeImportResult {
  folders: ImportableFolder[];
  flatList: { path: string; folder: ImportableFolder; depth: number; totalBookmarks: number }[];
}

export async function loadEdgeBookmarks(): Promise<EdgeImportResult> {
  const data = await readEdgeBookmarksTauri();
  const folders = extractFolders(data);
  const flat = flattenFolders(folders);

  return {
    folders,
    flatList: flat.map((f) => ({
      ...f,
      totalBookmarks: countBookmarks(f.folder),
    })),
  };
}

export { countBookmarks };
