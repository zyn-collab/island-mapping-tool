/**
 * Mobile-first mapping app for community data entry
 * Captures GPS location, category, notes, photos and submits to Google Sheets
 */

class MappingApp {
    constructor() {
        // Initialize app state
        this.config = null;
        this.currentLocation = null;
        this.map = null;
        this.marker = null;
        this.userLocationMarker = null;
        this.formData = {
            lat: null,
            lon: null,
            gps_accuracy_m: null,
            category: '',
            subcategory: '',
            tags: [],
            notes: '',
            photos: [],
            contact_name: '',
            contact_phone: '',
            contact_other: '',
            title_or_name: ''
        };
        
        // Initialize the app when DOM is loaded
        this.init();
    }

    /**
     * Initialize the application
     * Loads configuration and sets up event listeners
     */
    async init() {
        try {
            // Load configuration from config.json
            await this.loadConfig();
            
            // Set up event listeners for all interactive elements
            this.setupEventListeners();
            
            // Load any saved draft from localStorage
            this.loadDraft();
            
            console.log('Mapping app initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load app configuration. Please refresh the page.');
        }
    }

    /**
     * Load configuration from config.json file
     */
    async loadConfig() {
        try {
            const response = await fetch('./config.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.config = await response.json();
            console.log('Configuration loaded:', this.config);
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    }

    /**
     * Set up all event listeners for user interactions
     */
    setupEventListeners() {
        // Start screen button
        document.getElementById('start-btn').addEventListener('click', () => {
            this.showScreen('location-screen');
            this.requestLocation();
        });

        // Location screen buttons
        document.getElementById('recenter-btn').addEventListener('click', () => {
            this.requestLocation();
        });

        document.getElementById('manual-search-btn').addEventListener('click', () => {
            this.toggleManualSearch();
        });

        document.getElementById('search-btn').addEventListener('click', () => {
            this.performSearch();
        });

        document.getElementById('confirm-location-btn').addEventListener('click', () => {
            this.confirmLocation();
        });

        // Form screen elements
        document.getElementById('category-select').addEventListener('change', (e) => {
            this.onCategoryChange(e.target.value);
        });

        document.getElementById('subcategory-select').addEventListener('change', (e) => {
            this.onSubcategoryChange(e.target.value);
        });

        document.getElementById('notes-input').addEventListener('input', (e) => {
            this.updateNotesCount(e.target.value.length);
        });

        document.getElementById('add-photo-btn').addEventListener('click', () => {
            document.getElementById('photo-input').click();
        });

        document.getElementById('photo-input').addEventListener('change', (e) => {
            this.handlePhotoUpload(e.target.files);
        });

        document.getElementById('submit-btn').addEventListener('click', () => {
            this.submitForm();
        });

        // Success screen button
        document.getElementById('new-entry-btn').addEventListener('click', () => {
            this.startNewEntry();
        });

        // Search input enter key
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
    }

    /**
     * Show a specific screen and hide others
     * @param {string} screenId - ID of the screen to show
     */
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show the requested screen
        document.getElementById(screenId).classList.add('active');
        
        // Load form data if showing form screen
        if (screenId === 'form-screen') {
            this.loadFormData();
        }
    }

    /**
     * Request user's current location using GPS
     */
    requestLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser.');
            return;
        }

        // Show loading state
        const button = document.getElementById('recenter-btn');
        const originalText = button.textContent;
        button.textContent = 'Getting location...';
        button.disabled = true;

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.handleLocationSuccess(position);
                button.textContent = originalText;
                button.disabled = false;
            },
            (error) => {
                this.handleLocationError(error);
                button.textContent = originalText;
                button.disabled = false;
            },
            options
        );
    }

    /**
     * Handle successful GPS location retrieval
     * @param {GeolocationPosition} position - GPS position data
     */
    handleLocationSuccess(position) {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Store location data
        this.currentLocation = { lat: latitude, lon: longitude, accuracy: accuracy };
        this.formData.lat = latitude;
        this.formData.lon = longitude;
        this.formData.gps_accuracy_m = Math.round(accuracy);

        // Update display
        this.updateLocationDisplay(latitude, longitude, accuracy);

        // Initialize or update map
        this.initializeMap(latitude, longitude);

        console.log('Location obtained:', this.currentLocation);
    }

    /**
     * Handle GPS location error
     * @param {GeolocationPositionError} error - GPS error
     */
    handleLocationError(error) {
        let message = 'Unable to get your location. ';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message += 'Please allow location access and try again.';
                break;
            case error.POSITION_UNAVAILABLE:
                message += 'Location information is unavailable.';
                break;
            case error.TIMEOUT:
                message += 'Location request timed out.';
                break;
            default:
                message += 'An unknown error occurred.';
                break;
        }
        
        this.showError(message);
        console.error('Location error:', error);
    }

    /**
     * Update the location display with coordinates and accuracy
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude  
     * @param {number} accuracy - GPS accuracy in meters
     */
    updateLocationDisplay(lat, lon, accuracy) {
        document.getElementById('lat-display').textContent = lat.toFixed(6);
        document.getElementById('lon-display').textContent = lon.toFixed(6);
        document.getElementById('accuracy-display').textContent = `±${Math.round(accuracy)} m`;
    }

    /**
     * Initialize Leaflet map with user location
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     */
    initializeMap(lat, lon) {
        // Initialize map if not already done
        if (!this.map) {
            this.map = L.map('map').setView([lat, lon], 16);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);
        } else {
            // Update map view to new location
            this.map.setView([lat, lon], 16);
        }

        // Add or update user location marker (pulsing blue dot)
        if (this.userLocationMarker) {
            this.userLocationMarker.setLatLng([lat, lon]);
        } else {
            // Create pulsing icon for user location
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div class="pulse-dot"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            this.userLocationMarker = L.marker([lat, lon], { icon: userIcon })
                .addTo(this.map)
                .bindPopup('You are here');
        }

        // Add or update draggable pin marker
        if (this.marker) {
            this.marker.setLatLng([lat, lon]);
        } else {
            // Create custom pin icon
            const pinIcon = L.divIcon({
                className: 'draggable-pin',
                html: '<div class="pin-marker">📍</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });
            
            this.marker = L.marker([lat, lon], { 
                icon: pinIcon,
                draggable: true 
            }).addTo(this.map);

            // Update coordinates when pin is dragged
            this.marker.on('dragend', (e) => {
                const newPos = e.target.getLatLng();
                this.formData.lat = newPos.lat;
                this.formData.lon = newPos.lng;
                this.updateLocationDisplay(newPos.lat, newPos.lng, this.formData.gps_accuracy_m);
            });
        }
    }

    /**
     * Toggle manual search input visibility
     */
    toggleManualSearch() {
        const searchDiv = document.getElementById('manual-search');
        const isVisible = searchDiv.style.display !== 'none';
        searchDiv.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            document.getElementById('search-input').focus();
        }
    }

    /**
     * Perform search for place or coordinates
     */
    performSearch() {
        const query = document.getElementById('search-input').value.trim();
        
        if (!query) {
            this.showError('Please enter a search term or coordinates.');
            return;
        }

        // Check if input looks like coordinates (lat,lon format)
        const coordMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        
        if (coordMatch) {
            // Direct coordinate input
            const lat = parseFloat(coordMatch[1]);
            const lon = parseFloat(coordMatch[2]);
            
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                this.handleLocationSuccess({
                    coords: { latitude: lat, longitude: lon, accuracy: 0 }
                });
                document.getElementById('manual-search').style.display = 'none';
                document.getElementById('search-input').value = '';
            } else {
                this.showError('Invalid coordinates. Please use format: lat,lon');
            }
        } else {
            // Place name search (simplified - would need geocoding service in production)
            this.showError('Place search not implemented. Please use coordinates (lat,lon) format.');
        }
    }

    /**
     * Confirm current location and proceed to form
     */
    confirmLocation() {
        if (!this.formData.lat || !this.formData.lon) {
            this.showError('Please select a location first.');
            return;
        }

        // Save current state to draft
        this.saveDraft();
        
        // Move to form screen
        this.showScreen('form-screen');
    }

    /**
     * Load form data and populate category dropdowns
     */
    loadFormData() {
        // Populate category dropdown
        const categorySelect = document.getElementById('category-select');
        categorySelect.innerHTML = '<option value="">Select a category...</option>';
        
        this.config.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.code;
            option.textContent = category.label;
            categorySelect.appendChild(option);
        });

        // Clear subcategory dropdown
        const subcategorySelect = document.getElementById('subcategory-select');
        subcategorySelect.innerHTML = '<option value="">Select a subcategory...</option>';

        // Load tags
        this.loadTags();
    }

    /**
     * Handle category selection change
     * @param {string} categoryCode - Selected category code
     */
    onCategoryChange(categoryCode) {
        this.formData.category = categoryCode;
        
        // Update subcategory dropdown
        const subcategorySelect = document.getElementById('subcategory-select');
        subcategorySelect.innerHTML = '<option value="">Select a subcategory...</option>';
        
        if (categoryCode) {
            const category = this.config.categories.find(cat => cat.code === categoryCode);
            if (category && category.subcategories) {
                category.subcategories.forEach(subcategory => {
                    const option = document.createElement('option');
                    option.value = subcategory.code;
                    option.textContent = subcategory.label;
                    subcategorySelect.appendChild(option);
                });
            }
        }

        // Show/hide contact fields for business categories
        const contactFields = document.getElementById('contact-fields');
        if (categoryCode === 'business_service' || categoryCode === 'public_service') {
            contactFields.style.display = 'block';
        } else {
            contactFields.style.display = 'none';
        }

        // Clear dynamic fields
        this.clearDynamicFields();
        
        // Save draft
        this.saveDraft();
    }

    /**
     * Handle subcategory selection change
     * @param {string} subcategoryCode - Selected subcategory code
     */
    onSubcategoryChange(subcategoryCode) {
        this.formData.subcategory = subcategoryCode;
        
        // Generate dynamic fields based on subcategory
        this.generateDynamicFields(subcategoryCode);
        
        // Save draft
        this.saveDraft();
    }

    /**
     * Generate dynamic form fields based on subcategory
     * @param {string} subcategoryCode - Selected subcategory code
     */
    generateDynamicFields(subcategoryCode) {
        const container = document.getElementById('dynamic-fields');
        container.innerHTML = '';

        // Add title/name field for most categories
        if (subcategoryCode && !['price_item', 'pharmacy_stock'].includes(subcategoryCode)) {
            this.addDynamicField('title_or_name', 'Name/Title', 'text', 'Enter name or title...');
        }

        // Category-specific fields
        switch (subcategoryCode) {
            case 'streetlight':
                this.addDynamicField('light_working', 'Is the light working?', 'select', '', [
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' }
                ]);
                this.addDynamicField('lux_ground', 'Ground illumination (lux)', 'number', 'Enter lux reading...');
                break;

            case 'price_item':
                this.addDynamicField('price_item', 'Item', 'select', '', this.config.price_items);
                this.addDynamicField('price_mvr', 'Price (MVR)', 'number', 'Enter price...');
                this.addDynamicField('in_stock', 'In stock?', 'select', '', [
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' }
                ]);
                break;

            case 'pharmacy_stock':
                this.addDynamicField('med_item', 'Medicine', 'select', '', this.config.meds_availability);
                this.addDynamicField('med_availability', 'Availability', 'select', '', [
                    { value: 'in_stock', label: 'In stock' },
                    { value: 'out_of_stock', label: 'Out of stock' },
                    { value: 'limited', label: 'Limited stock' }
                ]);
                this.addDynamicField('med_price_mvr', 'Price (MVR)', 'number', 'Enter price if available...');
                break;

            case 'internet_speed':
                this.addDynamicField('isp', 'Internet Service Provider', 'text', 'Enter ISP name...');
                this.addDynamicField('down_mbps', 'Download speed (Mbps)', 'number', 'Enter download speed...');
                this.addDynamicField('up_mbps', 'Upload speed (Mbps)', 'number', 'Enter upload speed...');
                this.addDynamicField('ping_ms', 'Ping (ms)', 'number', 'Enter ping time...');
                break;

            case 'psip_project':
                this.addDynamicField('project_type', 'Project Type', 'text', 'Enter project type...');
                this.addDynamicField('progress_status', 'Progress Status', 'select', '', this.config.psip_status);
                this.addDynamicField('contractor', 'Contractor', 'text', 'Enter contractor name...');
                break;
        }
    }

    /**
     * Add a dynamic form field to the form
     * @param {string} fieldName - Field name/key
     * @param {string} label - Field label
     * @param {string} type - Input type (text, number, select, etc.)
     * @param {string} placeholder - Placeholder text
     * @param {Array} options - Options for select fields
     */
    addDynamicField(fieldName, label, type, placeholder = '', options = []) {
        const container = document.getElementById('dynamic-fields');
        
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'dynamic-field form-section';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.setAttribute('for', fieldName);
        
        let inputEl;
        
        if (type === 'select') {
            inputEl = document.createElement('select');
            inputEl.className = 'form-select';
            inputEl.id = fieldName;
            
            // Add placeholder option
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = placeholder || 'Select...';
            inputEl.appendChild(placeholderOption);
            
            // Add options
            options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option.value || option.name;
                optionEl.textContent = option.label;
                inputEl.appendChild(optionEl);
            });
        } else {
            inputEl = document.createElement('input');
            inputEl.type = type;
            inputEl.className = 'form-control';
            inputEl.id = fieldName;
            inputEl.placeholder = placeholder;
        }
        
        // Add change event listener to save draft
        inputEl.addEventListener('change', () => {
            this.formData[fieldName] = inputEl.value;
            this.saveDraft();
        });
        
        fieldDiv.appendChild(labelEl);
        fieldDiv.appendChild(inputEl);
        container.appendChild(fieldDiv);
    }

    /**
     * Clear all dynamic fields
     */
    clearDynamicFields() {
        document.getElementById('dynamic-fields').innerHTML = '';
    }

    /**
     * Load and display available tags
     */
    loadTags() {
        const container = document.getElementById('tags-container');
        container.innerHTML = '';
        
        this.config.tags.forEach(tag => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `tag-${tag.code}`;
            checkbox.className = 'tag-checkbox';
            checkbox.value = tag.code;
            
            const label = document.createElement('label');
            label.className = 'tag-label';
            label.setAttribute('for', `tag-${tag.code}`);
            label.textContent = tag.label;
            
            // Add change event listener
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    if (!this.formData.tags.includes(tag.code)) {
                        this.formData.tags.push(tag.code);
                    }
                } else {
                    this.formData.tags = this.formData.tags.filter(t => t !== tag.code);
                }
                this.saveDraft();
            });
            
            container.appendChild(checkbox);
            container.appendChild(label);
        });
    }

    /**
     * Update notes character count
     * @param {number} count - Current character count
     */
    updateNotesCount(count) {
        document.getElementById('notes-count').textContent = count;
        this.formData.notes = document.getElementById('notes-input').value;
        this.saveDraft();
    }

    /**
     * Handle photo file upload
     * @param {FileList} files - Selected files
     */
    handlePhotoUpload(files) {
        const maxPhotos = this.config.max_photos || 5;
        const maxSize = (this.config.max_photo_size_mb || 2) * 1024 * 1024; // Convert to bytes
        
        if (this.formData.photos.length + files.length > maxPhotos) {
            this.showError(`Maximum ${maxPhotos} photos allowed.`);
            return;
        }
        
        Array.from(files).forEach(file => {
            if (file.size > maxSize) {
                this.showError(`Photo ${file.name} is too large. Maximum size is ${this.config.max_photo_size_mb}MB.`);
                return;
            }
            
            this.compressAndAddPhoto(file);
        });
        
        // Clear file input
        document.getElementById('photo-input').value = '';
    }

    /**
     * Compress and add photo to the form
     * @param {File} file - Photo file to compress
     */
    compressAndAddPhoto(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Create canvas for compression
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions
                const maxWidth = this.config.photo_max_width || 1600;
                const quality = this.config.photo_compression_quality || 0.8;
                
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    
                    this.addPhotoToForm(compressedFile);
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    /**
     * Add compressed photo to the form data and display
     * @param {File} file - Compressed photo file
     */
    addPhotoToForm(file) {
        this.formData.photos.push(file);
        this.displayPhotos();
        this.saveDraft();
    }

    /**
     * Display uploaded photos in the preview area
     */
    displayPhotos() {
        const container = document.getElementById('photo-preview');
        container.innerHTML = '';
        
        this.formData.photos.forEach((photo, index) => {
            const photoDiv = document.createElement('div');
            photoDiv.className = 'photo-item';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(photo);
            img.alt = `Photo ${index + 1}`;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'photo-remove';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                this.removePhoto(index);
            };
            
            photoDiv.appendChild(img);
            photoDiv.appendChild(removeBtn);
            container.appendChild(photoDiv);
        });
    }

    /**
     * Remove photo from form data
     * @param {number} index - Index of photo to remove
     */
    removePhoto(index) {
        this.formData.photos.splice(index, 1);
        this.displayPhotos();
        this.saveDraft();
    }

    /**
     * Validate form data before submission
     * @returns {boolean} - True if valid, false otherwise
     */
    validateForm() {
        // Required fields validation
        if (!this.formData.lat || !this.formData.lon) {
            this.showError('Please select a location.');
            return false;
        }
        
        if (!this.formData.category) {
            this.showError('Please select a category.');
            return false;
        }
        
        if (!this.formData.subcategory) {
            this.showError('Please select a subcategory.');
            return false;
        }
        
        // Category-specific validation
        if (this.formData.subcategory === 'price_item') {
            if (!this.formData.price_item || !this.formData.price_mvr) {
                this.showError('Please fill in all required fields for price basket.');
                return false;
            }
        }
        
        if (this.formData.subcategory === 'pharmacy_stock') {
            if (!this.formData.med_item || !this.formData.med_availability) {
                this.showError('Please fill in all required fields for pharmacy stock.');
                return false;
            }
        }
        
        if (this.formData.subcategory === 'internet_speed') {
            if (!this.formData.down_mbps || !this.formData.up_mbps || !this.formData.ping_ms) {
                this.showError('Please fill in all required fields for internet speed test.');
                return false;
            }
        }
        
        return true;
    }

    /**
     * Submit form data to Google Apps Script endpoint
     */
    async submitForm() {
        if (!this.validateForm()) {
            return;
        }
        
        // Show loading overlay
        this.showLoading(true);
        
        try {
            // Prepare submission data
            const submissionData = this.prepareSubmissionData();
            
            // Create FormData for multipart upload
            const formData = new FormData();
            
            // Add JSON data
            formData.append('data', JSON.stringify(submissionData));
            
            // Add photos
            this.formData.photos.forEach((photo, index) => {
                formData.append(`photo_${index + 1}`, photo);
            });
            
            // Submit to Google Apps Script endpoint
            const response = await fetch(this.config.endpoint_url, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Clear draft and show success
                this.clearDraft();
                this.showScreen('success-screen');
            } else {
                throw new Error(result.error || 'Submission failed');
            }
            
        } catch (error) {
            console.error('Submission error:', error);
            this.showError('Failed to submit data. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Prepare submission data in the required format
     * @returns {Object} - Formatted submission data
     */
    prepareSubmissionData() {
        const now = new Date();
        
        return {
            submission_id: this.generateUUID(),
            submitted_at_iso: now.toISOString(),
            app_version: this.config.app_version,
            language: this.config.language,
            lat: this.formData.lat,
            lon: this.formData.lon,
            gps_accuracy_m: this.formData.gps_accuracy_m,
            category: this.formData.category,
            subcategory: this.formData.subcategory,
            tags: this.formData.tags.join(';'),
            title_or_name: this.formData.title_or_name || '',
            notes: this.formData.notes || '',
            contact_name: this.formData.contact_name || '',
            contact_phone: this.formData.contact_phone || '',
            contact_other: this.formData.contact_other || '',
            consent_confirmed: 'yes', // Assuming user agrees by submitting
            ip_hash: this.generateIPHash() // Simple hash for deduplication
        };
    }

    /**
     * Generate a UUID v4
     * @returns {string} - UUID string
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Generate a simple hash for IP deduplication
     * @returns {string} - Hashed value
     */
    generateIPHash() {
        // Simple hash based on user agent and timestamp
        const data = navigator.userAgent + Date.now();
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * Show or hide loading overlay
     * @param {boolean} show - Whether to show loading overlay
     */
    showLoading(show) {
        document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
    }

    /**
     * Show error message to user
     * @param {string} message - Error message to display
     */
    showError(message) {
        alert(message); // Simple alert for now - could be replaced with a modal
        console.error('User error:', message);
    }

    /**
     * Save current form data as draft to localStorage
     */
    saveDraft() {
        try {
            const draftData = {
                ...this.formData,
                timestamp: Date.now()
            };
            localStorage.setItem('mappingAppDraft', JSON.stringify(draftData));
        } catch (error) {
            console.error('Failed to save draft:', error);
        }
    }

    /**
     * Load saved draft from localStorage
     */
    loadDraft() {
        try {
            const draftData = localStorage.getItem('mappingAppDraft');
            if (draftData) {
                const draft = JSON.parse(draftData);
                
                // Check if draft is recent (within 24 hours)
                const hoursSinceDraft = (Date.now() - draft.timestamp) / (1000 * 60 * 60);
                if (hoursSinceDraft < 24) {
                    this.formData = { ...this.formData, ...draft };
                    console.log('Draft loaded:', this.formData);
                } else {
                    this.clearDraft();
                }
            }
        } catch (error) {
            console.error('Failed to load draft:', error);
            this.clearDraft();
        }
    }

    /**
     * Clear saved draft from localStorage
     */
    clearDraft() {
        try {
            localStorage.removeItem('mappingAppDraft');
            this.formData = {
                lat: null,
                lon: null,
                gps_accuracy_m: null,
                category: '',
                subcategory: '',
                tags: [],
                notes: '',
                photos: [],
                contact_name: '',
                contact_phone: '',
                contact_other: '',
                title_or_name: ''
            };
        } catch (error) {
            console.error('Failed to clear draft:', error);
        }
    }

    /**
     * Start a new entry (reset form and go to start screen)
     */
    startNewEntry() {
        this.clearDraft();
        this.currentLocation = null;
        this.formData = {
            lat: null,
            lon: null,
            gps_accuracy_m: null,
            category: '',
            subcategory: '',
            tags: [],
            notes: '',
            photos: [],
            contact_name: '',
            contact_phone: '',
            contact_other: '',
            title_or_name: ''
        };
        
        // Reset form elements
        document.getElementById('category-select').selectedIndex = 0;
        document.getElementById('subcategory-select').selectedIndex = 0;
        document.getElementById('notes-input').value = '';
        document.getElementById('photo-preview').innerHTML = '';
        
        this.showScreen('start-screen');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MappingApp();
});

// Add CSS for map markers
const style = document.createElement('style');
style.textContent = `
    .user-location-marker {
        background: #007bff;
        border-radius: 50%;
        animation: pulse 2s infinite;
    }
    
    .pulse-dot {
        width: 20px;
        height: 20px;
        background: #007bff;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.3);
    }
    
    .draggable-pin {
        cursor: move;
    }
    
    .pin-marker {
        font-size: 24px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.2);
            opacity: 0.7;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
