/**
 * Admin Content Editor JavaScript
 * Handles content editing functionality with rich text editing and real-time preview
 */

class ContentEditor {
    constructor() {
        this.section = null;
        this.content = [];
        this.isDirty = false;
        this.previewVisible = false;
        this.autosaveInterval = null;
        this.imageManagerVisible = false;
        this.availableImages = [];
        this.selectedImage = null;
        this.currentImageBlock = null;
        
        this.init();
    }
    
    async init() {
        try {
            // Show loading overlay
            this.showLoading();
            
            // Get section from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            this.section = urlParams.get('section');
            
            if (!this.section) {
                throw new Error('No section specified');
            }
            
            // Check authentication
            const authStatus = await this.checkAuthStatus();
            if (!authStatus.isAuthenticated) {
                window.location.href = '/admin/login';
                return;
            }
            
            // Initialize editor
            this.setupEventListeners();
            this.updateSectionTitle();
            await this.loadContent();
            this.setupAutosave();
            
            // Hide loading overlay
            this.hideLoading();
            
        } catch (error) {
            console.error('Editor initialization error:', error);
            this.showError('Failed to initialize editor: ' + error.message);
            this.hideLoading();
        }
    }
    
    setupEventListeners() {
        // Back button
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.handleBack();
            });
        }
        
        // Save button
        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.handleSave();
            });
        }
        
        // Preview button
        const previewButton = document.getElementById('previewButton');
        if (previewButton) {
            previewButton.addEventListener('click', () => {
                this.togglePreview();
            });
        }
        
        // Close preview button
        const closePreviewButton = document.getElementById('closePreviewButton');
        if (closePreviewButton) {
            closePreviewButton.addEventListener('click', () => {
                this.hidePreview();
            });
        }
        
        // Add text button
        const addTextButton = document.getElementById('addTextButton');
        if (addTextButton) {
            addTextButton.addEventListener('click', () => {
                this.addTextBlock();
            });
        }
        
        // Add image button
        const addImageButton = document.getElementById('addImageButton');
        if (addImageButton) {
            addImageButton.addEventListener('click', () => {
                this.addImageBlock();
            });
        }
        
        // Manage images button
        const manageImagesButton = document.getElementById('manageImagesButton');
        if (manageImagesButton) {
            manageImagesButton.addEventListener('click', () => {
                this.openImageManager();
            });
        }
        
        // Debug button
        const debugButton = document.getElementById('debugButton');
        if (debugButton) {
            debugButton.addEventListener('click', () => {
                this.openDebugPanel();
            });
        }
        
        // Clear all content button
        const clearAllContentButton = document.getElementById('clearAllContentButton');
        if (clearAllContentButton) {
            clearAllContentButton.addEventListener('click', () => {
                this.clearAllContent();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S for save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.handleSave();
            }
            
            // Ctrl/Cmd + P for preview
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                this.togglePreview();
            }
            
            // Escape to close preview
            if (e.key === 'Escape' && this.previewVisible) {
                this.hidePreview();
            }
        });
        
        // Event delegation for block action buttons
        const self = this;
        document.addEventListener('click', function(e) {
            // Only process clicks within the editor content area
            const editorContent = document.getElementById('editorContent');
            if (!editorContent || !editorContent.contains(e.target)) {
                return;
            }
            
            console.log('Editor click detected:', e.target);
            
            if (e.target.closest('.delete-block')) {
                console.log('Delete button clicked via event delegation');
                const blockElement = e.target.closest('.content-block');
                if (blockElement && blockElement.dataset.deleting !== 'true') {
                    console.log('Found block element:', blockElement.dataset.id);
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    self.deleteBlock(blockElement);
                }
            } else if (e.target.closest('.move-up')) {
                console.log('Move up button clicked via event delegation');
                const blockElement = e.target.closest('.content-block');
                if (blockElement) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.moveBlockUp(blockElement);
                }
            } else if (e.target.closest('.move-down')) {
                console.log('Move down button clicked via event delegation');
                const blockElement = e.target.closest('.content-block');
                if (blockElement) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.moveBlockDown(blockElement);
                }
            }
        }, true); // Use capture phase to handle events before they bubble
        
        // Warn before leaving if there are unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }
    
    async checkAuthStatus() {
        try {
            const response = await fetch('/admin/status', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Auth status check failed:', error);
            return { isAuthenticated: false };
        }
    }
    
    updateSectionTitle() {
        const sectionTitle = document.getElementById('sectionTitle');
        if (sectionTitle && this.section) {
            const sectionNames = {
                'interesanti': 'Interesanti Section',
                'gramatas': 'Grāmatas Section',
                'fragmenti': 'Fragmenti Section'
            };
            sectionTitle.textContent = sectionNames[this.section] || this.section;
        }
    }
    
    async loadContent() {
        try {
            const response = await fetch(`/admin/content/${this.section}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load content: HTTP ${response.status}`);
            }
            
            const data = await response.json();
            this.content = data.content || [];
            this.renderContent();
            this.isDirty = false;
            
        } catch (error) {
            console.error('Error loading content:', error);
            this.showError('Failed to load content: ' + error.message);
        }
    }
    
    renderContent() {
        const editorContent = document.getElementById('editorContent');
        if (!editorContent) return;
        
        // Clear existing content
        editorContent.innerHTML = '';
        
        if (this.content.length === 0) {
            // Show empty state
            const emptyState = document.createElement('div');
            emptyState.className = 'editor-empty-state';
            emptyState.innerHTML = `
                <div class="empty-state-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <h3>No content yet</h3>
                    <p>Start by adding a text block to create content for this section.</p>
                    <div style="display: flex; gap: 0.75rem; justify-content: center;">
                        <button class="button-primary" onclick="window.contentEditor.addTextBlock()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14,2 14,8 20,8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                            Add Text
                        </button>
                        <button class="button-secondary" onclick="window.contentEditor.addImageBlock()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21,15 16,10 5,21"></polyline>
                            </svg>
                            Add Image
                        </button>
                    </div>
                </div>
            `;
            editorContent.appendChild(emptyState);
            return;
        }
        
        // Render content blocks
        this.content.forEach((item, index) => {
            if (item.content_type === 'text') {
                const block = this.createTextBlock(item, index);
                editorContent.appendChild(block);
            } else if (item.content_type === 'image') {
                const block = this.createImageBlock(item, index);
                editorContent.appendChild(block);
            }
        });
    }
    
    createTextBlock(contentItem = null, index = -1) {
        const template = document.getElementById('textBlockTemplate');
        const block = template.content.cloneNode(true);
        const blockElement = block.querySelector('.content-block');
        
        // Set data attributes
        if (contentItem) {
            blockElement.dataset.id = contentItem.id;
            blockElement.dataset.index = index;
        }
        
        // Get editor input
        const editorInput = block.querySelector('.editor-input');
        if (contentItem && contentItem.content) {
            editorInput.innerHTML = contentItem.content;
        }
        
        // Setup toolbar buttons
        const toolbarButtons = block.querySelectorAll('.toolbar-button');
        toolbarButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const command = button.dataset.command;
                this.executeCommand(command, editorInput);
                this.markDirty();
            });
        });
        
        // Setup toolbar select elements
        const toolbarSelects = block.querySelectorAll('.toolbar-select');
        toolbarSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const command = select.dataset.command;
                const value = select.value;
                this.executeCommand(command, editorInput, value);
                this.markDirty();
            });
        });
        
        // Setup editor input events
        editorInput.addEventListener('input', () => {
            this.markDirty();
            this.updatePreview();
        });
        
        editorInput.addEventListener('keydown', (e) => {
            // Handle tab key for indentation
            if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '    ');
                return;
            }
            
            // Handle keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.executeCommand('bold', editorInput);
                        this.markDirty();
                        break;
                    case 'i':
                        e.preventDefault();
                        this.executeCommand('italic', editorInput);
                        this.markDirty();
                        break;
                    case 'u':
                        e.preventDefault();
                        this.executeCommand('underline', editorInput);
                        this.markDirty();
                        break;
                }
            }
        });
        
        // Setup block action buttons
        const moveUpButton = block.querySelector('.move-up');
        const moveDownButton = block.querySelector('.move-down');
        const deleteButton = block.querySelector('.delete-block');
        
        if (moveUpButton) {
            moveUpButton.addEventListener('click', () => {
                this.moveBlockUp(blockElement);
            });
        }
        
        if (moveDownButton) {
            moveDownButton.addEventListener('click', () => {
                this.moveBlockDown(blockElement);
            });
        }
        
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.deleteBlock(blockElement);
            });
        }
        
        return blockElement;
    }
    
    executeCommand(command, editorInput, value = null) {
        // Focus the editor input
        editorInput.focus();
        
        // Execute the command
        if (value) {
            document.execCommand(command, false, value);
        } else {
            document.execCommand(command, false, null);
        }
        
        // Update toolbar button states
        this.updateToolbarStates(editorInput);
    }
    
    updateToolbarStates(editorInput) {
        const toolbar = editorInput.closest('.text-editor').querySelector('.editor-toolbar');
        const buttons = toolbar.querySelectorAll('.toolbar-button');
        const selects = toolbar.querySelectorAll('.toolbar-select');
        
        // Update button states
        buttons.forEach(button => {
            const command = button.dataset.command;
            if (command) {
                const isActive = document.queryCommandState(command);
                button.classList.toggle('active', isActive);
            }
        });
        
        // Update select states
        selects.forEach(select => {
            const command = select.dataset.command;
            if (command === 'formatBlock') {
                const value = document.queryCommandValue('formatBlock');
                select.value = value || '';
            }
        });
    }
    
    addTextBlock() {
        const editorContent = document.getElementById('editorContent');
        if (!editorContent) return;
        
        // Remove empty state if present
        const emptyState = editorContent.querySelector('.editor-empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Create new text block
        const block = this.createTextBlock();
        editorContent.appendChild(block);
        
        // Focus the new block's editor
        const editorInput = block.querySelector('.editor-input');
        if (editorInput) {
            editorInput.focus();
        }
        
        this.markDirty();
    }
    
    moveBlockUp(blockElement) {
        const previousSibling = blockElement.previousElementSibling;
        if (previousSibling && !previousSibling.classList.contains('editor-empty-state')) {
            blockElement.parentNode.insertBefore(blockElement, previousSibling);
            this.markDirty();
        }
    }
    
    moveBlockDown(blockElement) {
        const nextSibling = blockElement.nextElementSibling;
        if (nextSibling) {
            blockElement.parentNode.insertBefore(nextSibling, blockElement);
            this.markDirty();
        }
    }
    
    deleteBlock(blockElement) {
        console.log('deleteBlock called for element:', blockElement);
        
        // Check if element is already being deleted or doesn't exist
        if (!blockElement || !blockElement.parentNode || blockElement.dataset.deleting === 'true') {
            console.log('Block already being deleted or not found, skipping');
            return;
        }
        
        console.log('Block ID:', blockElement.dataset.id);
        
        try {
            // Mark as being deleted to prevent duplicate calls
            blockElement.dataset.deleting = 'true';
            
            // Use a more reliable confirmation method
            const shouldDelete = window.confirm('Are you sure you want to delete this content block?');
            console.log('Confirmation result:', shouldDelete);
            
            if (shouldDelete) {
                console.log('User confirmed deletion, removing block');
                
                // Remove the block from DOM immediately
                blockElement.remove();
                console.log('Block removed from DOM');
                
                this.markDirty();
                
                // Show empty state if no blocks remain
                const editorContent = document.getElementById('editorContent');
                const remainingBlocks = editorContent.querySelectorAll('.content-block');
                console.log('Remaining blocks after deletion:', remainingBlocks.length);
                
                if (remainingBlocks.length === 0) {
                    console.log('No blocks remaining, will show empty state after save');
                    // Don't render content immediately - let the user save first
                }
                
                // Update preview if visible
                if (this.previewVisible) {
                    this.updatePreview();
                }
                
                // Mark as dirty so user can save manually
                console.log('Block deleted, marked as dirty for manual save');
                this.showSuccess('Block deleted. Click Save to confirm changes.');
                
            } else {
                console.log('User cancelled deletion');
                // Remove the deleting flag if cancelled
                delete blockElement.dataset.deleting;
            }
        } catch (error) {
            console.error('Error in deleteBlock:', error);
            // Remove the deleting flag on error
            if (blockElement) {
                delete blockElement.dataset.deleting;
            }
        }
    }
    
    createImageBlock(contentItem = null, index = -1) {
        const template = document.getElementById('imageBlockTemplate');
        const block = template.content.cloneNode(true);
        const blockElement = block.querySelector('.content-block');
        
        // Set data attributes
        if (contentItem) {
            blockElement.dataset.id = contentItem.id;
            blockElement.dataset.index = index;
        }
        
        // Get image elements
        const imagePreview = block.querySelector('.image-preview');
        const selectImageBtn = block.querySelector('.select-image-btn');
        const altTextInput = block.querySelector('.image-alt-text');
        
        // Set initial content
        if (contentItem && contentItem.content) {
            try {
                // Handle both JSON format and simple path format
                let imageData;
                let content = contentItem.content;
                
                // Decode HTML entities if present
                if (content.includes('&quot;') || content.includes('&#x2F;')) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = content;
                    content = tempDiv.textContent || tempDiv.innerText || '';
                }
                
                if (content.startsWith('{')) {
                    // New JSON format
                    imageData = JSON.parse(content);
                } else {
                    // Old simple path format
                    imageData = {
                        src: content,
                        alt: ''
                    };
                }
                
                this.updateImagePreview(imagePreview, imageData.src, imageData.alt);
                if (altTextInput) {
                    altTextInput.value = imageData.alt || '';
                }
            } catch (error) {
                console.error('Error parsing image data:', error);
                console.log('Problematic content:', contentItem.content);
                // Fallback: treat as simple path
                if (altTextInput) {
                    altTextInput.value = '';
                }
            }
        }
        
        // Setup select image button
        if (selectImageBtn) {
            selectImageBtn.addEventListener('click', () => {
                this.currentImageBlock = blockElement;
                this.openImageManager();
            });
        }
        
        // Setup alt text input
        if (altTextInput) {
            altTextInput.addEventListener('input', () => {
                this.markDirty();
            });
        }
        
        // Setup block action buttons
        const moveUpButton = block.querySelector('.move-up');
        const moveDownButton = block.querySelector('.move-down');
        const deleteButton = block.querySelector('.delete-block');
        
        if (moveUpButton) {
            moveUpButton.addEventListener('click', () => {
                this.moveBlockUp(blockElement);
            });
        }
        
        if (moveDownButton) {
            moveDownButton.addEventListener('click', () => {
                this.moveBlockDown(blockElement);
            });
        }
        
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.deleteBlock(blockElement);
            });
        }
        
        return blockElement;
    }
    
    updateImagePreview(previewContainer, imageSrc, altText = '') {
        const placeholder = previewContainer.querySelector('.image-placeholder');
        
        if (imageSrc) {
            // Remove placeholder and add image
            if (placeholder) {
                placeholder.remove();
            }
            
            let img = previewContainer.querySelector('img');
            if (!img) {
                img = document.createElement('img');
                previewContainer.appendChild(img);
            }
            
            img.src = imageSrc;
            img.alt = altText;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '200px';
            img.style.borderRadius = '6px';
            img.style.boxShadow = 'var(--editor-shadow)';
        } else {
            // Show placeholder
            if (!placeholder) {
                const placeholderEl = document.createElement('div');
                placeholderEl.className = 'image-placeholder';
                placeholderEl.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21,15 16,10 5,21"></polyline>
                    </svg>
                    <p>No image selected</p>
                `;
                previewContainer.appendChild(placeholderEl);
            }
            
            // Remove existing image
            const img = previewContainer.querySelector('img');
            if (img) {
                img.remove();
            }
        }
    }
    
    addImageBlock() {
        const editorContent = document.getElementById('editorContent');
        if (!editorContent) return;
        
        // Remove empty state if present
        const emptyState = editorContent.querySelector('.editor-empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Create new image block
        const block = this.createImageBlock();
        editorContent.appendChild(block);
        
        // Open image manager for the new block
        this.currentImageBlock = block;
        this.openImageManager();
        
        this.markDirty();
    }
    
    async openImageManager() {
        try {
            this.showLoading();
            
            // Load available images
            await this.loadAvailableImages();
            
            // Setup image manager modal
            this.setupImageManagerModal();
            
            // Show modal
            const modal = document.getElementById('imageManagerModal');
            if (modal) {
                modal.classList.add('show');
                this.imageManagerVisible = true;
            }
            
        } catch (error) {
            console.error('Error opening image manager:', error);
            this.showError('Failed to load image manager: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    async loadAvailableImages() {
        try {
            const response = await fetch('/admin/images', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load images: HTTP ${response.status}`);
            }
            
            const data = await response.json();
            this.availableImages = data.images || [];
            
        } catch (error) {
            console.error('Error loading images:', error);
            throw error;
        }
    }
    
    setupImageManagerModal() {
        // Setup close button
        const closeBtn = document.getElementById('closeImageManager');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeImageManager();
        }
        
        // Setup upload button
        const uploadBtn = document.getElementById('uploadImagesBtn');
        const uploadInput = document.getElementById('imageUploadInput');
        
        if (uploadBtn && uploadInput) {
            uploadBtn.onclick = () => uploadInput.click();
            uploadInput.onchange = (e) => this.handleImageUpload(e);
        }
        
        // Setup filter
        const filterSelect = document.getElementById('imageTypeFilter');
        if (filterSelect) {
            filterSelect.onchange = () => this.filterImages();
        }
        
        // Setup modal buttons
        const cancelBtn = document.getElementById('cancelImageSelection');
        const selectBtn = document.getElementById('selectImageBtn');
        
        if (cancelBtn) {
            cancelBtn.onclick = () => this.closeImageManager();
        }
        
        if (selectBtn) {
            selectBtn.onclick = () => this.selectImage();
        }
        
        // Render image gallery
        this.renderImageGallery();
    }
    
    renderImageGallery() {
        const gallery = document.getElementById('imageGallery');
        if (!gallery) return;
        
        // Clear loading state
        gallery.innerHTML = '';
        
        if (this.availableImages.length === 0) {
            gallery.innerHTML = `
                <div class="gallery-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21,15 16,10 5,21"></polyline>
                    </svg>
                    <p>No images available</p>
                    <p>Upload some images to get started</p>
                </div>
            `;
            return;
        }
        
        // Create gallery grid
        const grid = document.createElement('div');
        grid.className = 'gallery-grid';
        
        // Filter images based on current filter
        const filter = document.getElementById('imageTypeFilter')?.value || 'all';
        const filteredImages = filter === 'all' ? 
            this.availableImages : 
            this.availableImages.filter(img => img.type === filter);
        
        filteredImages.forEach(image => {
            const item = this.createGalleryItem(image);
            grid.appendChild(item);
        });
        
        gallery.appendChild(grid);
    }
    
    createGalleryItem(image) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.filename = image.filename;
        item.dataset.path = image.path;
        item.dataset.type = image.type;
        
        item.innerHTML = `
            <img src="${image.path}" alt="${image.filename}" class="gallery-item-image" />
            <div class="gallery-item-info">
                <p class="gallery-item-name">${image.filename}</p>
                <div class="gallery-item-meta">
                    <span class="gallery-item-type ${image.type}">${image.type}</span>
                    <span>${this.formatFileSize(image.size)}</span>
                </div>
            </div>
            <div class="gallery-item-actions">
                ${image.type === 'uploaded' ? `
                    <button class="gallery-action-button delete" title="Delete Image" onclick="window.contentEditor.deleteImage('${image.filename}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;
        
        // Add click handler for selection
        item.addEventListener('click', () => {
            this.selectGalleryItem(item);
        });
        
        return item;
    }
    
    selectGalleryItem(item) {
        // Remove previous selection
        const previousSelected = document.querySelector('.gallery-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        
        // Select current item
        item.classList.add('selected');
        this.selectedImage = {
            filename: item.dataset.filename,
            path: item.dataset.path,
            type: item.dataset.type
        };
        
        // Enable select button
        const selectBtn = document.getElementById('selectImageBtn');
        if (selectBtn) {
            selectBtn.disabled = false;
        }
    }
    
    async handleImageUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        try {
            // Show upload progress
            const progressEl = document.getElementById('uploadProgress');
            const progressFill = progressEl?.querySelector('.progress-fill');
            const progressText = progressEl?.querySelector('.progress-text');
            
            if (progressEl) {
                progressEl.style.display = 'flex';
            }
            
            // Create form data
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('images', files[i]);
            }
            
            // Upload files
            const response = await fetch('/admin/upload', {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            // Hide upload progress
            if (progressEl) {
                progressEl.style.display = 'none';
            }
            
            // Reload images and refresh gallery
            await this.loadAvailableImages();
            this.renderImageGallery();
            
            this.showSuccess(`Successfully uploaded ${result.files.length} image(s)`);
            
            // Clear file input
            event.target.value = '';
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Failed to upload images: ' + error.message);
            
            // Hide upload progress
            const progressEl = document.getElementById('uploadProgress');
            if (progressEl) {
                progressEl.style.display = 'none';
            }
        }
    }
    
    async deleteImage(filename) {
        if (!confirm('Are you sure you want to delete this image?')) {
            return;
        }
        
        try {
            const response = await fetch(`/admin/image/${encodeURIComponent(filename)}`, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            // Reload images and refresh gallery
            await this.loadAvailableImages();
            this.renderImageGallery();
            
            this.showSuccess('Image deleted successfully');
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showError('Failed to delete image: ' + error.message);
        }
    }
    
    selectImage() {
        if (!this.selectedImage || !this.currentImageBlock) {
            return;
        }
        
        // Update the image block
        const imagePreview = this.currentImageBlock.querySelector('.image-preview');
        const altTextInput = this.currentImageBlock.querySelector('.image-alt-text');
        
        if (imagePreview) {
            this.updateImagePreview(imagePreview, this.selectedImage.path, altTextInput?.value || '');
        }
        
        // Mark as dirty
        this.markDirty();
        
        // Close modal
        this.closeImageManager();
    }
    
    closeImageManager() {
        const modal = document.getElementById('imageManagerModal');
        if (modal) {
            modal.classList.remove('show');
            this.imageManagerVisible = false;
        }
        
        // Reset selection
        this.selectedImage = null;
        this.currentImageBlock = null;
        
        // Disable select button
        const selectBtn = document.getElementById('selectImageBtn');
        if (selectBtn) {
            selectBtn.disabled = true;
        }
    }
    
    filterImages() {
        this.renderImageGallery();
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    collectContentData() {
        const editorContent = document.getElementById('editorContent');
        const blocks = editorContent.querySelectorAll('.content-block');
        const contentData = [];
        
        console.log('collectContentData: Found', blocks.length, 'blocks in DOM');
        
        blocks.forEach((block, index) => {
            console.log('Processing block', index, 'ID:', block.dataset.id, 'Type:', block.dataset.type);
            if (block.classList.contains('text-block')) {
                const editorInput = block.querySelector('.editor-input');
                const content = editorInput.innerHTML;
                
                // Only include blocks with actual content
                // Empty blocks will be automatically deleted by the server logic
                const trimmedContent = content.trim();
                const hasContent = trimmedContent && 
                                 trimmedContent !== '<br>' && 
                                 trimmedContent !== '<div><br></div>' &&
                                 trimmedContent !== '<p><br></p>' &&
                                 trimmedContent !== '<p></p>' &&
                                 trimmedContent.replace(/<[^>]*>/g, '').trim().length > 0;
                
                if (hasContent) {
                    const item = {
                        content_type: 'text',
                        content: content,
                        order_index: index
                    };
                    
                    // Include ID if this is an existing item
                    const id = block.dataset.id;
                    if (id && id !== 'undefined') {
                        item.id = parseInt(id);
                    }
                    
                    contentData.push(item);
                }
            } else if (block.classList.contains('image-block')) {
                const imagePreview = block.querySelector('.image-preview');
                const altTextInput = block.querySelector('.image-alt-text');
                const img = imagePreview?.querySelector('img');
                
                // Only include blocks with actual images
                if (img && img.src && !img.src.includes('data:')) {
                    const imageData = {
                        src: img.src,
                        alt: altTextInput?.value || ''
                    };
                    
                    const item = {
                        content_type: 'image',
                        content: JSON.stringify(imageData),
                        order_index: index
                    };
                    
                    // Include ID if this is an existing item
                    const id = block.dataset.id;
                    if (id && id !== 'undefined') {
                        item.id = parseInt(id);
                    }
                    
                    contentData.push(item);
                }
            }
        });
        
        return contentData;
    }
    
    cleanupEmptyBlocks() {
        const editorContent = document.getElementById('editorContent');
        const blocks = editorContent.querySelectorAll('.content-block');
        
        blocks.forEach(block => {
            let isEmpty = false;
            
            if (block.classList.contains('text-block')) {
                const editorInput = block.querySelector('.editor-input');
                const content = editorInput.innerHTML.trim();
                
                isEmpty = !content || 
                         content === '<br>' || 
                         content === '<div><br></div>' ||
                         content === '<p><br></p>' ||
                         content === '<p></p>' ||
                         content.replace(/<[^>]*>/g, '').trim().length === 0;
            } else if (block.classList.contains('image-block')) {
                const imagePreview = block.querySelector('.image-preview');
                const img = imagePreview?.querySelector('img');
                
                isEmpty = !img || !img.src || img.src.includes('data:');
            }
            
            if (isEmpty) {
                console.log('Removing empty block:', block.dataset.id || 'new block');
                block.remove();
            }
        });
        
        // Show empty state if no blocks remain
        const remainingBlocks = editorContent.querySelectorAll('.content-block');
        if (remainingBlocks.length === 0) {
            console.log('cleanupEmptyBlocks: No blocks remaining, but not re-rendering to avoid recreating deleted blocks');
            // Don't call renderContent() here as it recreates blocks from this.content
            // The empty state will be shown after successful save
        }
    }
    
    async handleSave() {
        try {
            this.showLoading();
            
            // Clean up empty blocks before collecting data
            this.cleanupEmptyBlocks();
            
            const contentData = this.collectContentData();
            
            // Debug logging
            console.log('Saving content for section:', this.section);
            console.log('Content data being sent:', contentData);
            console.log('Number of content items:', contentData.length);
            
            const response = await fetch(`/admin/content/${this.section}`, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: contentData })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            this.content = result.content || [];
            this.isDirty = false;
            
            // Re-render content to ensure UI is in sync with server
            await this.loadContent();
            
            this.showSuccess('Content saved successfully!');
            this.updatePreview();
            
        } catch (error) {
            console.error('Save error:', error);
            this.showError('Failed to save content: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    handleBack() {
        if (this.isDirty) {
            if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
                window.location.href = '/admin/dashboard.html';
            }
        } else {
            window.location.href = '/admin/dashboard.html';
        }
    }
    
    togglePreview() {
        if (this.previewVisible) {
            this.hidePreview();
        } else {
            this.showPreview();
        }
    }
    
    showPreview() {
        const previewPanel = document.getElementById('previewPanel');
        if (previewPanel) {
            previewPanel.classList.add('show');
            this.previewVisible = true;
            this.updatePreview();
        }
    }
    
    hidePreview() {
        const previewPanel = document.getElementById('previewPanel');
        if (previewPanel) {
            previewPanel.classList.remove('show');
            this.previewVisible = false;
        }
    }
    
    updatePreview() {
        if (!this.previewVisible) return;
        
        const previewContent = document.getElementById('previewContent');
        if (!previewContent) return;
        
        const contentData = this.collectContentData();
        
        if (contentData.length === 0) {
            previewContent.innerHTML = `
                <div class="preview-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <p>No content to preview</p>
                </div>
            `;
            return;
        }
        
        // Generate preview HTML
        let previewHTML = '<div class="section-preview">';
        
        contentData.forEach(item => {
            if (item.content_type === 'text') {
                previewHTML += `<div class="text-content">${item.content}</div>`;
            } else if (item.content_type === 'image') {
                try {
                    // Handle both JSON format and simple path format
                    let imageData;
                    let content = item.content;
                    
                    // Decode HTML entities if present
                    if (content.includes('&quot;') || content.includes('&#x2F;')) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = content;
                        content = tempDiv.textContent || tempDiv.innerText || '';
                    }
                    
                    if (content.startsWith('{')) {
                        imageData = JSON.parse(content);
                    } else {
                        imageData = { src: content, alt: '' };
                    }
                    previewHTML += `<div class="image-content"><img src="${imageData.src}" alt="${imageData.alt}" style="max-width: 100%; height: auto; border-radius: 6px; box-shadow: var(--editor-shadow);"></div>`;
                } catch (error) {
                    console.error('Error parsing image data for preview:', error);
                }
            }
        });
        
        previewHTML += '</div>';
        previewContent.innerHTML = previewHTML;
    }
    
    setupAutosave() {
        // Auto-save every 30 seconds if there are changes
        this.autosaveInterval = setInterval(() => {
            if (this.isDirty) {
                this.handleSave();
            }
        }, 30000);
    }
    
    markDirty() {
        this.isDirty = true;
        
        // Update save button state
        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.classList.add('has-changes');
        }
    }
    
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('show');
        }
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }
    
    showMessage(message, type = 'info') {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `editor-message editor-message-${type}`;
        messageEl.innerHTML = `
            <div class="editor-message-content">
                <span class="editor-message-text">${message}</span>
                <button class="editor-message-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add styles for the message
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            max-width: 400px;
            background: var(--editor-panel-bg);
            border-radius: 8px;
            box-shadow: var(--editor-shadow-lg);
            border-left: 4px solid ${type === 'error' ? 'var(--editor-error)' : type === 'success' ? 'var(--editor-success)' : 'var(--editor-primary)'};
            animation: slideInRight 0.3s ease;
        `;
        
        const contentStyle = `
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
        `;
        
        const textStyle = `
            color: var(--editor-text-color);
            font-size: 0.875rem;
            line-height: 1.4;
            flex: 1;
        `;
        
        const closeStyle = `
            background: none;
            border: none;
            font-size: 1.25rem;
            color: var(--editor-text-light);
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s ease;
        `;
        
        messageEl.querySelector('.editor-message-content').style.cssText = contentStyle;
        messageEl.querySelector('.editor-message-text').style.cssText = textStyle;
        messageEl.querySelector('.editor-message-close').style.cssText = closeStyle;
        
        document.body.appendChild(messageEl);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentElement) {
                messageEl.remove();
            }
        }, 5000);
    }
    
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    showInfo(message) {
        this.showMessage(message, 'info');
    }
    
    // Debug method to test delete functionality
    testDeleteFirstBlock() {
        const editorContent = document.getElementById('editorContent');
        const firstBlock = editorContent.querySelector('.content-block');
        if (firstBlock) {
            console.log('Testing delete on first block:', firstBlock.dataset.id);
            this.deleteBlock(firstBlock);
        } else {
            console.log('No blocks found to delete');
        }
    }
    
    // Method to delete and immediately save
    async deleteBlockAndSave(blockElement) {
        console.log('Delete and save called for block:', blockElement.dataset.id);
        
        if (!blockElement || !blockElement.parentNode) {
            console.log('Block not found');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this content block?')) {
            return;
        }
        
        try {
            // Remove from DOM
            blockElement.remove();
            console.log('Block removed from DOM');
            
            // Immediately save the changes
            await this.handleSave();
            
            console.log('Changes saved successfully');
            
        } catch (error) {
            console.error('Error in deleteBlockAndSave:', error);
            this.showError('Failed to delete content: ' + error.message);
        }
    }
    
    // Debug method to list all blocks
    listBlocks() {
        const editorContent = document.getElementById('editorContent');
        const blocks = editorContent.querySelectorAll('.content-block');
        console.log('Current blocks:');
        blocks.forEach((block, index) => {
            console.log(`${index + 1}. ID: ${block.dataset.id}, Type: ${block.classList.contains('text-block') ? 'text' : 'image'}`);
        });
        return blocks;
    }
    
    // Debug method to clear all content
    async clearAllContent() {
        console.log('Clearing all content for section:', this.section);
        
        if (!confirm('Are you sure you want to delete ALL content in this section? This cannot be undone.')) {
            return;
        }
        
        try {
            this.showLoading();
            
            const response = await fetch(`/admin/content/${this.section}`, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: [] })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('All content cleared successfully');
            
            // Clear the DOM immediately
            const editorContent = document.getElementById('editorContent');
            if (editorContent) {
                editorContent.innerHTML = '';
            }
            
            // Reload content to reflect changes
            await this.loadContent();
            
            this.showSuccess('All content cleared successfully');
            
        } catch (error) {
            console.error('Error clearing content:', error);
            this.showError('Failed to clear content: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    // Method to force delete a specific block by ID
    async forceDeleteBlockById(blockId) {
        console.log('Force deleting block with ID:', blockId);
        
        try {
            // Get current content
            const currentData = this.collectContentData();
            
            // Filter out the block with the specified ID
            const filteredData = currentData.filter(item => item.id !== parseInt(blockId));
            
            console.log('Original content items:', currentData.length);
            console.log('Filtered content items:', filteredData.length);
            
            // Save the filtered content
            const response = await fetch(`/admin/content/${this.section}`, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: filteredData })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            // Reload content to reflect changes
            await this.loadContent();
            
            console.log('Block force deleted successfully');
            this.showSuccess('Content deleted successfully');
            
        } catch (error) {
            console.error('Error force deleting block:', error);
            this.showError('Failed to delete content: ' + error.message);
        }
    }
    
    openDebugPanel() {
        const modal = document.getElementById('debugModal');
        if (modal) {
            modal.classList.add('show');
        }
        
        // Setup close button
        const closeBtn = document.getElementById('closeDebugModal');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeDebugPanel();
        }
        
        // Setup debug panel buttons
        this.setupDebugPanelButtons();
    }
    
    setupDebugPanelButtons() {
        const listBlocksBtn = document.getElementById('listBlocksBtn');
        const testDeleteBtn = document.getElementById('testDeleteBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');
        const forceDeleteBtn = document.getElementById('forceDeleteBtn');
        
        if (listBlocksBtn) {
            listBlocksBtn.onclick = () => this.listBlocks();
        }
        
        if (testDeleteBtn) {
            testDeleteBtn.onclick = () => this.testDeleteFirstBlock();
        }
        
        if (clearAllBtn) {
            clearAllBtn.onclick = () => this.clearAllContent();
        }
        
        if (forceDeleteBtn) {
            forceDeleteBtn.onclick = () => {
                const input = document.getElementById('blockIdInput');
                const blockId = input.value;
                if (blockId) {
                    this.forceDeleteBlockById(blockId);
                    input.value = '';
                } else {
                    alert('Please enter a valid block ID');
                }
            };
        }
    }
    
    closeDebugPanel() {
        const modal = document.getElementById('debugModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    destroy() {
        // Clean up intervals
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
        }
    }
}

// Add CSS animation for message slide-in
const editorStyle = document.createElement('style');
editorStyle.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .editor-message-close:hover {
        background-color: var(--editor-bg-color) !important;
    }
    
    .editor-empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
        color: var(--editor-text-light);
    }
    
    .empty-state-content svg {
        width: 64px;
        height: 64px;
        margin-bottom: 1.5rem;
        opacity: 0.5;
    }
    
    .empty-state-content h3 {
        font-family: 'Nunito', sans-serif;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--editor-text-color);
        margin: 0 0 0.5rem 0;
    }
    
    .empty-state-content p {
        margin: 0 0 2rem 0;
        font-size: 0.875rem;
    }
    
    .has-changes {
        background: var(--editor-warning) !important;
        color: white !important;
    }
    
    .text-content {
        margin-bottom: 1rem;
    }
    
    .text-content:last-child {
        margin-bottom: 0;
    }
    
    .image-content {
        margin-bottom: 1rem;
        text-align: center;
    }
    
    .image-content:last-child {
        margin-bottom: 0;
    }
`;
document.head.appendChild(editorStyle);

// Global function for debug panel
function forceDeleteById() {
    const input = document.getElementById('blockIdInput');
    const blockId = input.value;
    if (blockId && window.contentEditor) {
        window.contentEditor.forceDeleteBlockById(blockId);
        input.value = '';
    } else {
        alert('Please enter a valid block ID');
    }
}

// Global function to immediately delete block 18 (for console use)
function deleteBlock18() {
    if (window.contentEditor) {
        console.log('Attempting to force delete block 18...');
        window.contentEditor.forceDeleteBlockById(18);
    } else {
        console.error('Content editor not available');
    }
}

// Global function to clear all content (for console use)
function clearFragmenti() {
    if (window.contentEditor) {
        console.log('Attempting to clear all content in fragmenti section...');
        window.contentEditor.clearAllContent();
    } else {
        console.error('Content editor not available');
    }
}

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contentEditor = new ContentEditor();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.contentEditor) {
        window.contentEditor.destroy();
    }
});