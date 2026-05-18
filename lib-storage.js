// ═══════════════════════════════════════════════════════════════════════════
// PRAJAPATI ERP — Supabase Storage Helper
// Upload images/files to bucket "prajapati-uploads"
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE = (function() {
  const BUCKET = 'prajapati-uploads';
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

  /**
   * Upload a file to Supabase Storage
   * @param {File} file - the file from input
   * @param {string} folder - subfolder (e.g., 'branding', 'catalogue', 'receipts')
   * @param {string} [customName] - optional custom filename (without ext)
   * @returns {Promise<{url, path}>} - public URL and storage path
   */
  async function uploadFile(file, folder = 'misc', customName = null) {
    if (!file) throw new Error('No file provided');
    if (file.size > MAX_SIZE) throw new Error(`File too large (max ${MAX_SIZE / 1024 / 1024}MB)`);
    
    // Generate filename
    const ext = file.name.split('.').pop().toLowerCase();
    const baseName = customName || `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const fileName = `${baseName}.${ext}`;
    const path = `${folder}/${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await sb().storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
    
    if (error) {
      // Common error: bucket doesn't exist
      if (error.message.includes('Bucket not found')) {
        throw new Error('Storage bucket not setup. Please create "prajapati-uploads" bucket in Supabase dashboard.');
      }
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = sb().storage
      .from(BUCKET)
      .getPublicUrl(path);
    
    return {
      url: urlData.publicUrl,
      path: path,
      size: file.size,
      type: file.type
    };
  }

  /**
   * Upload an image with validation
   */
  async function uploadImage(file, folder = 'misc', customName = null) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(`Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
    }
    return uploadFile(file, folder, customName);
  }

  /**
   * Delete a file from storage
   */
  async function deleteFile(path) {
    if (!path) return;
    // Extract path from URL if URL given
    if (path.startsWith('http')) {
      const match = path.match(/prajapati-uploads\/(.+)$/);
      if (!match) return;
      path = match[1];
    }
    const { error } = await sb().storage.from(BUCKET).remove([path]);
    if (error) console.warn('Delete failed:', error);
  }

  /**
   * Create a drag-drop file uploader UI
   * @param {object} options - {targetEl, accept, folder, currentUrl, label, onUpload, onError}
   */
  function createUploader(options) {
    const { 
      targetEl, 
      accept = 'image/*', 
      folder = 'misc',
      currentUrl = '', 
      label = 'Upload Image',
      onUpload = () => {},
      onError = () => {},
      maxSize = MAX_SIZE
    } = options;
    
    if (!targetEl) {
      console.error('createUploader: targetEl required');
      return;
    }
    
    const isImage = accept.includes('image');
    const previewType = isImage ? 'image' : 'file';
    
    targetEl.innerHTML = `
      <div class="storage-uploader" style="border:2px dashed var(--line);border-radius:8px;padding:14px;background:var(--cream);transition:all 0.15s">
        ${currentUrl ? `
          <div class="upl-preview" style="margin-bottom:10px;text-align:center">
            ${previewType === 'image' 
              ? `<img src="${escapeHtml(currentUrl)}" style="max-width:200px;max-height:120px;object-fit:contain;border-radius:6px;background:white;padding:6px">`
              : `<div style="padding:14px;background:white;border-radius:6px;font-size:12px;color:var(--mute);font-weight:600">📄 File uploaded</div>`}
            <div style="margin-top:6px;font-size:10px;color:var(--mute);word-break:break-all">${escapeHtml(currentUrl).substring(0, 60)}...</div>
          </div>
        ` : ''}
        
        <input type="file" class="upl-input" accept="${accept}" style="display:none">
        
        <div class="upl-zone" style="text-align:center;cursor:pointer;padding:14px;border-radius:6px;transition:all 0.15s">
          <div style="font-size:28px;margin-bottom:4px">📁</div>
          <div style="font-size:12px;font-weight:800;color:var(--ink);margin-bottom:2px">${label}</div>
          <div style="font-size:10px;color:var(--mute);font-weight:600">Click or drag-drop · Max ${(maxSize/1024/1024).toFixed(0)}MB</div>
        </div>
        
        <div class="upl-progress" style="display:none;margin-top:10px">
          <div style="height:4px;background:var(--line);border-radius:2px;overflow:hidden">
            <div class="upl-bar" style="width:0%;height:100%;background:var(--accent);transition:width 0.3s"></div>
          </div>
          <div class="upl-status" style="margin-top:4px;font-size:11px;color:var(--mute);font-weight:600">Uploading...</div>
        </div>
        
        ${currentUrl ? `
          <button type="button" class="upl-remove" style="margin-top:8px;width:100%;padding:6px;background:var(--red-soft);color:var(--red-dk);border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">🗑️ Remove</button>
        ` : ''}
      </div>
    `;
    
    const zone = targetEl.querySelector('.upl-zone');
    const input = targetEl.querySelector('.upl-input');
    const progress = targetEl.querySelector('.upl-progress');
    const bar = targetEl.querySelector('.upl-bar');
    const status = targetEl.querySelector('.upl-status');
    const removeBtn = targetEl.querySelector('.upl-remove');
    
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.style.background = 'var(--blue-soft)';
    });
    zone.addEventListener('dragleave', e => {
      e.preventDefault();
      zone.style.background = '';
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.style.background = '';
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        handleUpload(input.files[0]);
      }
    });
    input.addEventListener('change', () => {
      if (input.files.length) handleUpload(input.files[0]);
    });
    
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        if (!confirm('Remove this file?')) return;
        await deleteFile(currentUrl);
        onUpload({ url: '', path: '' });
      });
    }
    
    async function handleUpload(file) {
      if (file.size > maxSize) {
        const msg = `File too large (max ${(maxSize/1024/1024).toFixed(0)}MB)`;
        if (typeof UI !== 'undefined') UI.toast('❌ ' + msg, 'error');
        else alert(msg);
        onError(new Error(msg));
        return;
      }
      
      progress.style.display = 'block';
      zone.style.opacity = '0.5';
      zone.style.pointerEvents = 'none';
      bar.style.width = '30%';
      status.textContent = `Uploading ${file.name}...`;
      
      try {
        const result = isImage 
          ? await uploadImage(file, folder)
          : await uploadFile(file, folder);
        
        bar.style.width = '100%';
        status.textContent = '✅ Upload complete!';
        status.style.color = 'var(--green-dk)';
        
        setTimeout(() => onUpload(result), 500);
      } catch (e) {
        progress.style.display = 'none';
        zone.style.opacity = '1';
        zone.style.pointerEvents = '';
        const msg = e.message || 'Upload failed';
        if (typeof UI !== 'undefined') UI.toast('❌ ' + msg, 'error');
        else alert(msg);
        onError(e);
      }
    }
  }
  
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return {
    BUCKET,
    uploadFile,
    uploadImage,
    deleteFile,
    createUploader
  };
})();
