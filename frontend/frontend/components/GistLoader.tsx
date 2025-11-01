'use client';

import { useState } from 'react';

type GistLoaderProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (code: string, language: string) => void;
};

type RepoFile = {
  name: string;
  path: string;
  size: number;
  type: string;
  download_url?: string;
};

export default function GistLoader({ isOpen, onClose, onLoad }: GistLoaderProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'input' | 'browse'>('input');
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<RepoFile | null>(null);

  if (!isOpen) return null;

  const detectLanguage = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.py')) return 'python';
    if (lower.endsWith('.js')) return 'javascript';
    if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
    if (lower.endsWith('.java')) return 'java';
    if (lower.endsWith('.cs')) return 'csharp';
    if (lower.endsWith('.go')) return 'go';
    if (lower.endsWith('.rs')) return 'rust';
    if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.c')) return 'cpp';
    if (lower.endsWith('.php')) return 'php';
    if (lower.endsWith('.rb')) return 'ruby';
    return 'python';
  };

  const loadFromGist = async (gistId: string) => {
    const response = await fetch(`https://api.github.com/gists/${gistId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch gist');
    }

    const data = await response.json();
    const files = Object.values(data.files) as any[];
    
    if (files.length === 0) {
      throw new Error('No files found in gist');
    }

    const file = files[0];
    const content = file.content;
    const language = detectLanguage(file.filename);

    onLoad(content, language);
    onClose();
  };

  const loadFromRepo = async (owner: string, repo: string, path: string = '') => {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch repository');
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      // It's a directory, show files
      const files = data.filter((item: RepoFile) => 
        item.type === 'file' && 
        item.size < 100000 && // Only files < 100KB
        /\.(py|js|ts|tsx|java|cs|go|rs|cpp|c|php|rb)$/i.test(item.name)
      );
      
      if (files.length === 0) {
        throw new Error('No supported code files found (max 100KB)');
      }

      setRepoFiles(files);
      setMode('browse');
    } else {
      // It's a single file
      if (!data.download_url) {
        throw new Error('Cannot download this file');
      }

      const fileResponse = await fetch(data.download_url);
      const content = await fileResponse.text();
      const language = detectLanguage(data.name);

      onLoad(content, language);
      onClose();
    }
  };

  const handleLoad = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if it's a Gist URL
      const gistMatch = url.match(/gist\.github\.com\/(?:[\w-]+\/)?([a-f0-9]+)/);
      if (gistMatch) {
        await loadFromGist(gistMatch[1]);
        return;
      }

      // Check if it's a GitHub repo URL
      const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/(?:tree|blob)\/[^\/]+\/(.+))?/);
      if (repoMatch) {
        const [, owner, repo, path] = repoMatch;
        await loadFromRepo(owner, repo, path || '');
        return;
      }

      throw new Error('Invalid URL. Please provide a GitHub Gist or Repository URL');
    } catch (err: any) {
      setError(err.message || 'Failed to load from GitHub');
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: RepoFile) => {
    setLoading(true);
    setError('');

    try {
      if (!file.download_url) {
        throw new Error('Cannot download this file');
      }

      const response = await fetch(file.download_url);
      const content = await response.text();
      const language = detectLanguage(file.name);

      onLoad(content, language);
      onClose();
      resetState();
    } catch (err: any) {
      setError(err.message || 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setUrl('');
    setMode('input');
    setRepoFiles([]);
    setSelectedFile(null);
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'input' ? 'Load from GitHub' : 'Select a File'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mode === 'input' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                GitHub URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repo or https://gist.github.com/..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-2">
                Supports: GitHub Gist, Repository root, or direct file URLs
              </p>
            </div>

            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <p className="text-sm text-blue-200 mb-2">
                <strong>Examples:</strong>
              </p>
              <ul className="text-xs text-blue-300 space-y-1">
                <li>• Gist: https://gist.github.com/username/abc123</li>
                <li>• Repo: https://github.com/owner/repo</li>
                <li>• File: https://github.com/owner/repo/blob/main/file.py</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-900/50 text-red-200 border border-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleLoad}
                disabled={loading || !url}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => {
                setMode('input');
                setRepoFiles([]);
                setError('');
              }}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>

            <p className="text-sm text-gray-400">
              Found {repoFiles.length} code file{repoFiles.length !== 1 ? 's' : ''} (max 100KB each)
            </p>

            {error && (
              <div className="bg-red-900/50 text-red-200 border border-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {repoFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => handleFileSelect(file)}
                  disabled={loading}
                  className="w-full text-left bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-xs text-gray-400">{file.path}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
