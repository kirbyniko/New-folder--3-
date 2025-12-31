/**
 * File Manager Component
 * 
 * Context file management with:
 * - Upload files (drag & drop)
 * - Create new files
 * - Edit files with Monaco
 * - Delete/organize files
 * - Search across files
 */

import * as monaco from 'monaco-editor';

export class FileManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.files = this.loadFiles();
    this.currentFile = null;
    this.editor = null;
    
    this.init();
  }

  loadFiles() {
    return JSON.parse(localStorage.getItem('context_files') || '{}');
  }

  saveFiles() {
    localStorage.setItem('context_files', JSON.stringify(this.files));
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.initEditor();
  }

  render() {
    this.container.innerHTML = `
      <div class="file-manager">
        <!-- Sidebar: File List -->
        <div class="file-sidebar">
          <div class="sidebar-header">
            <h3>📁 Context Files</h3>
            <button id="new-file-btn" class="btn btn-sm btn-primary">+ New</button>
          </div>
          
          <div class="file-search">
            <input type="text" id="file-search" placeholder="🔍 Search files...">
          </div>
          
          <div id="file-list" class="file-list">
            ${this.renderFileList()}
          </div>
          
          <div class="sidebar-footer">
            <button id="upload-file-btn" class="btn btn-sm">📤 Upload</button>
            <input type="file" id="file-upload-input" multiple style="display:none">
            <button id="export-all-btn" class="btn btn-sm">💾 Export All</button>
          </div>
        </div>

        <!-- Main: File Editor -->
        <div class="file-editor-panel">
          <div class="editor-header">
            <div class="file-info">
              <span id="current-file-name">No file selected</span>
              <span id="file-size"></span>
            </div>
            <div class="editor-actions">
              <button id="save-file-btn" class="btn btn-sm btn-success" disabled>💾 Save</button>
              <button id="delete-file-btn" class="btn btn-sm btn-danger" disabled>🗑️ Delete</button>
            </div>
          </div>
          
          <div id="file-editor" class="file-editor-container"></div>
          
          <div class="editor-footer">
            <span id="cursor-position">Ln 1, Col 1</span>
            <span id="file-type"></span>
          </div>
        </div>
      </div>
    `;
  }

  renderFileList() {
    const fileNames = Object.keys(this.files);
    
    if (fileNames.length === 0) {
      return '<div class="empty-state">No files yet. Create or upload files to get started.</div>';
    }
    
    return fileNames.map(name => `
      <div class="file-item ${this.currentFile === name ? 'active' : ''}" data-file="${name}">
        <span class="file-icon">${this.getFileIcon(name)}</span>
        <span class="file-name">${name}</span>
        <span class="file-actions">
          <button class="file-action-btn" onclick="fileManager.renameFile('${name}')">✏️</button>
        </span>
      </div>
    `).join('');
  }

  getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
      'js': '📜',
      'ts': '📘',
      'json': '📋',
      'md': '📝',
      'html': '🌐',
      'css': '🎨',
      'txt': '📄'
    };
    return icons[ext] || '📄';
  }

  attachEventListeners() {
    // New file
    document.getElementById('new-file-btn').addEventListener('click', () => this.createNewFile());
    
    // Upload
    document.getElementById('upload-file-btn').addEventListener('click', () => {
      document.getElementById('file-upload-input').click();
    });
    
    document.getElementById('file-upload-input').addEventListener('change', (e) => {
      this.uploadFiles(e.target.files);
    });
    
    // Save/Delete
    document.getElementById('save-file-btn').addEventListener('click', () => this.saveCurrentFile());
    document.getElementById('delete-file-btn').addEventListener('click', () => this.deleteFile(this.currentFile));
    
    // Export all
    document.getElementById('export-all-btn').addEventListener('click', () => this.exportAllFiles());
    
    // Search
    document.getElementById('file-search').addEventListener('input', (e) => {
      this.filterFiles(e.target.value);
    });
    
    // File selection
    document.getElementById('file-list').addEventListener('click', (e) => {
      const fileItem = e.target.closest('.file-item');
      if (fileItem) {
        this.openFile(fileItem.dataset.file);
      }
    });
    
    // Drag & drop
    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.container.classList.add('drag-over');
    });
    
    this.container.addEventListener('dragleave', () => {
      this.container.classList.remove('drag-over');
    });
    
    this.container.addEventListener('drop', (e) => {
      e.preventDefault();
      this.container.classList.remove('drag-over');
      this.uploadFiles(e.dataTransfer.files);
    });
  }

  initEditor() {
    const editorContainer = document.getElementById('file-editor');
    
    this.editor = monaco.editor.create(editorContainer, {
      value: '// Select a file to edit or create a new one',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      wordWrap: 'on',
      lineNumbers: 'on',
      readOnly: true
    });

    // Track changes
    this.editor.onDidChangeModelContent(() => {
      if (this.currentFile) {
        document.getElementById('save-file-btn').disabled = false;
      }
    });

    // Update cursor position
    this.editor.onDidChangeCursorPosition((e) => {
      document.getElementById('cursor-position').textContent = 
        `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });
  }

  createNewFile() {
    const fileName = prompt('Enter file name (e.g., scraper-guide.md):');
    if (!fileName) return;
    
    if (this.files[fileName]) {
      alert('File already exists!');
      return;
    }
    
    this.files[fileName] = '';
    this.saveFiles();
    this.refreshFileList();
    this.openFile(fileName);
  }

  async uploadFiles(fileList) {
    const files = Array.from(fileList);
    
    for (const file of files) {
      const content = await file.text();
      this.files[file.name] = content;
    }
    
    this.saveFiles();
    this.refreshFileList();
    alert(`✅ Uploaded ${files.length} file(s)`);
  }

  openFile(fileName) {
    this.currentFile = fileName;
    const content = this.files[fileName] || '';
    
    // Update editor
    this.editor.setValue(content);
    this.editor.updateOptions({ readOnly: false });
    
    // Detect language
    const ext = fileName.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'json': 'json',
      'md': 'markdown',
      'html': 'html',
      'css': 'css',
      'py': 'python',
      'txt': 'plaintext'
    };
    monaco.editor.setModelLanguage(this.editor.getModel(), languageMap[ext] || 'plaintext');
    
    // Update UI
    document.getElementById('current-file-name').textContent = fileName;
    document.getElementById('file-size').textContent = `${content.length} characters`;
    document.getElementById('file-type').textContent = ext.toUpperCase();
    document.getElementById('save-file-btn').disabled = true;
    document.getElementById('delete-file-btn').disabled = false;
    
    this.refreshFileList();
  }

  saveCurrentFile() {
    if (!this.currentFile) return;
    
    const content = this.editor.getValue();
    this.files[this.currentFile] = content;
    this.saveFiles();
    
    document.getElementById('save-file-btn').disabled = true;
    document.getElementById('file-size').textContent = `${content.length} characters`;
    alert(`✅ Saved "${this.currentFile}"`);
  }

  deleteFile(fileName) {
    if (!fileName) return;
    
    if (!confirm(`Delete "${fileName}"?`)) return;
    
    delete this.files[fileName];
    this.saveFiles();
    
    if (this.currentFile === fileName) {
      this.currentFile = null;
      this.editor.setValue('// File deleted');
      this.editor.updateOptions({ readOnly: true });
      document.getElementById('current-file-name').textContent = 'No file selected';
      document.getElementById('delete-file-btn').disabled = true;
    }
    
    this.refreshFileList();
  }

  renameFile(oldName) {
    const newName = prompt('New name:', oldName);
    if (!newName || newName === oldName) return;
    
    if (this.files[newName]) {
      alert('File already exists!');
      return;
    }
    
    this.files[newName] = this.files[oldName];
    delete this.files[oldName];
    this.saveFiles();
    
    if (this.currentFile === oldName) {
      this.currentFile = newName;
    }
    
    this.refreshFileList();
    this.openFile(newName);
  }

  filterFiles(query) {
    const fileItems = document.querySelectorAll('.file-item');
    const lowerQuery = query.toLowerCase();
    
    fileItems.forEach(item => {
      const fileName = item.dataset.file.toLowerCase();
      const content = this.files[item.dataset.file].toLowerCase();
      const matches = fileName.includes(lowerQuery) || content.includes(lowerQuery);
      item.style.display = matches ? 'flex' : 'none';
    });
  }

  exportAllFiles() {
    const dataStr = JSON.stringify(this.files, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `context-files-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  refreshFileList() {
    document.getElementById('file-list').innerHTML = this.renderFileList();
  }

  getFiles() {
    return this.files;
  }
}
