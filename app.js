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
            photos: []
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
            console.log('Initializing mapping app...');
            
            // Load configuration from config.json
            await this.loadConfig();
            console.log('Config loaded successfully');
            
            // Set up event listeners for all interactive elements
            this.setupEventListeners();
            console.log('Event listeners set up');
            
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
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log('Start button clicked!');
                this.showScreen('location-screen');
                this.requestLocation();
            });
            console.log('Start button event listener added');
        } else {
            console.error('Start button not found!');
        }

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

        // Category popup elements
        document.getElementById('close-popup').addEventListener('click', () => {
            this.hideCategoryPopup();
        });

        // Form screen elements
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

        // Navigation buttons
        document.getElementById('back-to-start').addEventListener('click', () => {
            this.showScreen('start-screen');
        });

        document.getElementById('back-to-location').addEventListener('click', () => {
            this.showScreen('location-screen');
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
        console.log('Showing screen:', screenId);
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show the requested screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            console.log('Screen shown:', screenId);
        } else {
            console.error('Screen not found:', screenId);
        }
        
        // Load form data if showing form screen
        if (screenId === 'form-screen') {
            this.loadFormData();
            // Show category popup immediately when form screen loads
            setTimeout(() => {
                this.showCategoryPopup();
            }, 100);
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
        
        // Move to form screen (popup will show automatically)
        this.showScreen('form-screen');
    }

    /**
     * Show category selection popup
     */
    showCategoryPopup() {
        console.log('Showing category popup...');
        const popup = document.getElementById('category-popup');
        if (popup) {
            popup.style.display = 'flex';
            this.loadCategoryGrid();
            console.log('Category popup should be visible now');
        } else {
            console.error('Category popup element not found!');
        }
    }

    /**
     * Hide category selection popup
     */
    hideCategoryPopup() {
        document.getElementById('category-popup').style.display = 'none';
    }

    /**
     * Load category grid with icons
     */
    loadCategoryGrid() {
        console.log('Loading category grid...');
        const container = document.getElementById('category-grid');
        if (!container) {
            console.error('Category grid container not found!');
            return;
        }
        
        container.innerHTML = '';

        // Category icons mapping
        const categoryIcons = {
            'business_service': '🏪',
            'public_community': '🏛️',
            'social_services': '🤝',
            'infrastructure_utility': '🔧',
            'transport_travel': '🚢',
            'environment_hazard': '⚠️',
            'price_basket': '🛒',
            'health_pharmacy': '💊',
            'health_facility': '🏥',
            'accessibility': '♿',
            'plants_trees': '🌳',
            'psip_project': '🏗️',
            'internet_speed': '📶',
            'water_air_soil': '💧',
            'contacts_info': '📞',
            'immediate_drops': '⚡',
            'accessibility_check': '♿',
            'other': '📍'
        };

        console.log('Categories to load:', this.config.categories.length);
        this.config.categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.onclick = () => this.selectCategory(category);

            const icon = document.createElement('div');
            icon.className = 'category-item-icon';
            icon.textContent = categoryIcons[category.code] || '📍';

            const label = document.createElement('div');
            label.className = 'category-item-label';
            label.textContent = category.label;

            categoryItem.appendChild(icon);
            categoryItem.appendChild(label);
            container.appendChild(categoryItem);
        });
        
        console.log('Category grid loaded with', container.children.length, 'items');
    }

    /**
     * Select a category and proceed
     * @param {Object} category - Selected category object
     */
    selectCategory(category) {
        this.formData.category = category.code;
        
        // Hide popup
        this.hideCategoryPopup();
        
        // Show selected category
        this.showSelectedCategory(category);
        
        // Load subcategories
        this.loadSubcategories(category);
        
        // Show subcategory section
        this.showSection('subcategory-section');
        
        // Save draft
        this.saveDraft();
    }

    /**
     * Show selected category display
     * @param {Object} category - Selected category
     */
    showSelectedCategory(category) {
        const selectedDiv = document.getElementById('selected-category');
        const iconEl = document.getElementById('category-icon');
        const nameEl = document.getElementById('category-name');
        const descEl = document.getElementById('category-description');
        
        // Category icons mapping
        const categoryIcons = {
            'business_service': '🏪',
            'public_community': '🏛️',
            'social_services': '🤝',
            'infrastructure_utility': '🔧',
            'transport_travel': '🚢',
            'environment_hazard': '⚠️',
            'price_basket': '🛒',
            'health_pharmacy': '💊',
            'health_facility': '🏥',
            'accessibility': '♿',
            'plants_trees': '🌳',
            'psip_project': '🏗️',
            'internet_speed': '📶',
            'water_air_soil': '💧',
            'contacts_info': '📞',
            'immediate_drops': '⚡',
            'accessibility_check': '♿',
            'other': '📍'
        };
        
        iconEl.textContent = categoryIcons[category.code] || '📍';
        nameEl.textContent = category.label;
        descEl.textContent = 'Tap to change category';
        
        selectedDiv.style.display = 'block';
        
        // Make it clickable to change category
        selectedDiv.onclick = () => this.showCategoryPopup();
    }

    /**
     * Load subcategories for selected category
     * @param {Object} category - Selected category
     */
    loadSubcategories(category) {
        const subcategorySelect = document.getElementById('subcategory-select');
        subcategorySelect.innerHTML = '<option value="">Select...</option>';
        
        if (category && category.subcategories) {
            category.subcategories.forEach(subcategory => {
                const option = document.createElement('option');
                option.value = subcategory.code;
                option.textContent = subcategory.label;
                subcategorySelect.appendChild(option);
            });
        }
    }

    /**
     * Show a form section with animation
     * @param {string} sectionId - ID of section to show
     */
    showSection(sectionId) {
        const section = document.getElementById(sectionId);
        section.style.display = 'block';
        section.classList.add('show');
    }

    /**
     * Load form data and setup form
     */
    loadFormData() {
        // Clear subcategory dropdown
        const subcategorySelect = document.getElementById('subcategory-select');
        subcategorySelect.innerHTML = '<option value="">Select...</option>';

        // Load tags
        this.loadTags();
    }

    /**
     * Handle subcategory selection change
     * @param {string} subcategoryCode - Selected subcategory code
     */
    onSubcategoryChange(subcategoryCode) {
        this.formData.subcategory = subcategoryCode;
        
        // Show remaining sections
        this.showSection('notes-section');
        this.showSection('tags-section');
        this.showSection('photos-section');
        this.showSection('submit-section');
        
        // Add category-specific fields for certain subcategories
        this.addCategorySpecificFields(subcategoryCode);
        
        // Save draft
        this.saveDraft();
    }

    /**
     * Add category-specific fields based on subcategory
     * @param {string} subcategoryCode - Selected subcategory code
     */
    addCategorySpecificFields(subcategoryCode) {
        // Clear any existing dynamic fields
        this.clearDynamicFields();
        
        // Handle immediate drops - skip subcategory selection
        if (this.isImmediateDrop(subcategoryCode)) {
            this.handleImmediateDrop(subcategoryCode);
            return;
        }
        
        // Handle accessibility check
        if (subcategoryCode === 'accessibility_audit') {
            this.addAccessibilityChecklist();
            return;
        }
        
        // Handle quick note - skip subcategory selection
        if (subcategoryCode === 'quick_note') {
            this.handleQuickNote();
            return;
        }
        
        switch (subcategoryCode) {
            case 'price_item':
                this.addPriceBasketFields();
                break;
            case 'pharmacy_stock':
                this.addPharmacyFields();
                break;
            case 'internet_speed':
                this.addInternetSpeedFields();
                break;
            case 'streetlight':
                this.addStreetlightFields();
                break;
            case 'psip_project':
                this.addPSIPFields();
                break;
        }
    }

    /**
     * Check if subcategory is an immediate drop
     * @param {string} subcategoryCode - Subcategory code to check
     * @returns {boolean} - True if immediate drop
     */
    isImmediateDrop(subcategoryCode) {
        const immediateDrops = [
            'motorcycle', 'car', 'broken_vehicle', 'road_depression', 'unpaved',
            'working_streetlight', 'broken_streetlight', 'under_construction',
            'abandoned_construction', 'rubble', 'vacant_home', 'flood_zone'
        ];
        return immediateDrops.includes(subcategoryCode);
    }

    /**
     * Handle immediate drop - skip to notes/photos
     * @param {string} subcategoryCode - Immediate drop code
     */
    handleImmediateDrop(subcategoryCode) {
        // Hide subcategory section since we're skipping it
        document.getElementById('subcategory-section').style.display = 'none';
        
        // Show remaining sections immediately
        this.showSection('notes-section');
        this.showSection('tags-section');
        this.showSection('photos-section');
        this.showSection('submit-section');
    }

    /**
     * Handle quick note - skip to notes/photos
     */
    handleQuickNote() {
        // Hide subcategory section since we're skipping it
        document.getElementById('subcategory-section').style.display = 'none';
        
        // Show remaining sections immediately
        this.showSection('notes-section');
        this.showSection('tags-section');
        this.showSection('photos-section');
        this.showSection('submit-section');
    }

    /**
     * Add price basket specific fields
     */
    addPriceBasketFields() {
        const container = document.getElementById('dynamic-fields');
        
        // Item selection
        const itemDiv = document.createElement('div');
        itemDiv.className = 'form-section';
        itemDiv.innerHTML = `
            <label for="price-item-select" class="form-label">Select Item *</label>
            <select id="price-item-select" class="form-select" required>
                <option value="">Choose an item...</option>
            </select>
        `;
        container.appendChild(itemDiv);
        
        // Populate items
        const select = document.getElementById('price-item-select');
        this.config.price_items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.name;
            option.textContent = item.label;
            select.appendChild(option);
        });
        
        // Price field
        const priceDiv = document.createElement('div');
        priceDiv.className = 'form-section';
        priceDiv.innerHTML = `
            <label for="price-mvr" class="form-label">Price (MVR) *</label>
            <input type="number" id="price-mvr" class="form-control" placeholder="Enter price..." required>
        `;
        container.appendChild(priceDiv);
        
        // Stock status
        const stockDiv = document.createElement('div');
        stockDiv.className = 'form-section';
        stockDiv.innerHTML = `
            <label for="in-stock" class="form-label">In Stock? *</label>
            <select id="in-stock" class="form-select" required>
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
            </select>
        `;
        container.appendChild(stockDiv);
        
        // Add event listeners
        select.addEventListener('change', () => {
            this.formData.price_item = select.value;
            this.saveDraft();
        });
        
        document.getElementById('price-mvr').addEventListener('change', (e) => {
            this.formData.price_mvr = e.target.value;
            this.saveDraft();
        });
        
        document.getElementById('in-stock').addEventListener('change', (e) => {
            this.formData.in_stock = e.target.value;
            this.saveDraft();
        });
    }

    /**
     * Add pharmacy specific fields
     */
    addPharmacyFields() {
        const container = document.getElementById('dynamic-fields');
        
        // Medicine selection
        const medDiv = document.createElement('div');
        medDiv.className = 'form-section';
        medDiv.innerHTML = `
            <label for="med-item-select" class="form-label">Select Medicine *</label>
            <select id="med-item-select" class="form-select" required>
                <option value="">Choose a medicine...</option>
            </select>
        `;
        container.appendChild(medDiv);
        
        // Populate medicines
        const select = document.getElementById('med-item-select');
        this.config.meds_availability.forEach(med => {
            const option = document.createElement('option');
            option.value = med.name;
            option.textContent = med.label;
            select.appendChild(option);
        });
        
        // Availability status
        const availDiv = document.createElement('div');
        availDiv.className = 'form-section';
        availDiv.innerHTML = `
            <label for="med-availability" class="form-label">Availability *</label>
            <select id="med-availability" class="form-select" required>
                <option value="">Select...</option>
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="limited">Limited Stock</option>
            </select>
        `;
        container.appendChild(availDiv);
        
        // Price field (optional)
        const priceDiv = document.createElement('div');
        priceDiv.className = 'form-section';
        priceDiv.innerHTML = `
            <label for="med-price-mvr" class="form-label">Price (MVR) - Optional</label>
            <input type="number" id="med-price-mvr" class="form-control" placeholder="Enter price if available...">
        `;
        container.appendChild(priceDiv);
        
        // Add event listeners
        select.addEventListener('change', () => {
            this.formData.med_item = select.value;
            this.saveDraft();
        });
        
        document.getElementById('med-availability').addEventListener('change', (e) => {
            this.formData.med_availability = e.target.value;
            this.saveDraft();
        });
        
        document.getElementById('med-price-mvr').addEventListener('change', (e) => {
            this.formData.med_price_mvr = e.target.value;
            this.saveDraft();
        });
    }

    /**
     * Add internet speed test fields
     */
    addInternetSpeedFields() {
        const container = document.getElementById('dynamic-fields');
        
        const fields = [
            { id: 'isp', label: 'Internet Service Provider', type: 'text', placeholder: 'Enter ISP name...' },
            { id: 'down-mbps', label: 'Download Speed (Mbps)', type: 'number', placeholder: 'Enter download speed...' },
            { id: 'up-mbps', label: 'Upload Speed (Mbps)', type: 'number', placeholder: 'Enter upload speed...' },
            { id: 'ping-ms', label: 'Ping (ms)', type: 'number', placeholder: 'Enter ping time...' }
        ];
        
        fields.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'form-section';
            fieldDiv.innerHTML = `
                <label for="${field.id}" class="form-label">${field.label} *</label>
                <input type="${field.type}" id="${field.id}" class="form-control" placeholder="${field.placeholder}" required>
            `;
            container.appendChild(fieldDiv);
            
            // Add event listener
            document.getElementById(field.id).addEventListener('change', (e) => {
                const fieldName = field.id.replace('-', '_');
                this.formData[fieldName] = e.target.value;
                this.saveDraft();
            });
        });
    }

    /**
     * Add streetlight specific fields
     */
    addStreetlightFields() {
        const container = document.getElementById('dynamic-fields');
        
        // Working status
        const workingDiv = document.createElement('div');
        workingDiv.className = 'form-section';
        workingDiv.innerHTML = `
            <label for="light-working" class="form-label">Is the light working? *</label>
            <select id="light-working" class="form-select" required>
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
            </select>
        `;
        container.appendChild(workingDiv);
        
        // Lux reading
        const luxDiv = document.createElement('div');
        luxDiv.className = 'form-section';
        luxDiv.innerHTML = `
            <label for="lux-ground" class="form-label">Ground Illumination (lux)</label>
            <input type="number" id="lux-ground" class="form-control" placeholder="Enter lux reading...">
        `;
        container.appendChild(luxDiv);
        
        // Add event listeners
        document.getElementById('light-working').addEventListener('change', (e) => {
            this.formData.light_working = e.target.value;
            this.saveDraft();
        });
        
        document.getElementById('lux-ground').addEventListener('change', (e) => {
            this.formData.lux_ground = e.target.value;
            this.saveDraft();
        });
    }

    /**
     * Add PSIP project specific fields
     */
    addPSIPFields() {
        const container = document.getElementById('dynamic-fields');
        
        const fields = [
            { id: 'project-type', label: 'Project Type', type: 'text', placeholder: 'Enter project type...' },
            { id: 'progress-status', label: 'Progress Status', type: 'select', options: this.config.psip_status },
            { id: 'contractor', label: 'Contractor', type: 'text', placeholder: 'Enter contractor name...' }
        ];
        
        fields.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'form-section';
            
            if (field.type === 'select') {
                fieldDiv.innerHTML = `
                    <label for="${field.id}" class="form-label">${field.label}</label>
                    <select id="${field.id}" class="form-select">
                        <option value="">Select...</option>
                    </select>
                `;
                
                const select = fieldDiv.querySelector('select');
                field.options.forEach(option => {
                    const optionEl = document.createElement('option');
                    optionEl.value = option.name;
                    optionEl.textContent = option.label;
                    select.appendChild(optionEl);
                });
            } else {
                fieldDiv.innerHTML = `
                    <label for="${field.id}" class="form-label">${field.label}</label>
                    <input type="${field.type}" id="${field.id}" class="form-control" placeholder="${field.placeholder}">
                `;
            }
            
            container.appendChild(fieldDiv);
            
            // Add event listener
            const element = document.getElementById(field.id);
            element.addEventListener('change', (e) => {
                const fieldName = field.id.replace('-', '_');
                this.formData[fieldName] = e.target.value;
                this.saveDraft();
            });
        });
    }

    /**
     * Add accessibility checklist
     */
    addAccessibilityChecklist() {
        const container = document.getElementById('dynamic-fields');
        
        const checklistDiv = document.createElement('div');
        checklistDiv.className = 'form-section';
        checklistDiv.innerHTML = `
            <label class="form-label">Accessibility Checklist</label>
            <div class="accessibility-checklist">
                <div class="checklist-section">
                    <h6>Approach & Paths</h6>
                    <label><input type="checkbox" data-category="approach"> Step-free route present</label>
                    <label><input type="checkbox" data-category="approach"> Path clear of obstacles</label>
                    <label><input type="checkbox" data-category="approach"> Surface firm, non-slip</label>
                    <label><input type="checkbox" data-category="approach"> Kerb cuts at corners</label>
                    <label><input type="checkbox" data-category="approach"> Bumpy paving at crossings</label>
                    <label><input type="checkbox" data-category="approach"> Crossings have audible signal</label>
                </div>
                
                <div class="checklist-section">
                    <h6>Ramp</h6>
                    <label><input type="checkbox" data-category="ramp"> Ramp provided where needed</label>
                    <label><input type="checkbox" data-category="ramp"> Ramp feels gentle slope</label>
                    <label><input type="checkbox" data-category="ramp"> Ramp surface grips shoes</label>
                    <label><input type="checkbox" data-category="ramp"> Handrails on both sides</label>
                    <label><input type="checkbox" data-category="ramp"> Ramp edge kerb present</label>
                    <label><input type="checkbox" data-category="ramp"> Level landings at ends</label>
                </div>
                
                <div class="checklist-section">
                    <h6>Entrance</h6>
                    <label><input type="checkbox" data-category="entrance"> No step at entrance</label>
                    <label><input type="checkbox" data-category="entrance"> Doorway wide for wheelchair</label>
                    <label><input type="checkbox" data-category="entrance"> Door opens with light push</label>
                    <label><input type="checkbox" data-category="entrance"> Automatic door or assistance</label>
                    <label><input type="checkbox" data-category="entrance"> Doorbell/intercom within reach</label>
                </div>
                
                <div class="checklist-section">
                    <h6>Toilets</h6>
                    <label><input type="checkbox" data-category="toilets"> Accessible toilet provided</label>
                    <label><input type="checkbox" data-category="toilets"> Door easy to open</label>
                    <label><input type="checkbox" data-category="toilets"> Wheelchair can turn inside</label>
                    <label><input type="checkbox" data-category="toilets"> Grab bars feel solid</label>
                    <label><input type="checkbox" data-category="toilets"> Sink, soap within reach</label>
                    <label><input type="checkbox" data-category="toilets"> Lever-style tap handles</label>
                </div>
            </div>
        `;
        container.appendChild(checklistDiv);
        
        // Add event listeners for checkboxes
        const checkboxes = checklistDiv.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateAccessibilityData();
            });
        });
    }

    /**
     * Update accessibility data from checkboxes
     */
    updateAccessibilityData() {
        const checkboxes = document.querySelectorAll('.accessibility-checklist input[type="checkbox"]');
        const accessibilityData = {};
        
        checkboxes.forEach(checkbox => {
            const category = checkbox.dataset.category;
            if (!accessibilityData[category]) {
                accessibilityData[category] = [];
            }
            if (checkbox.checked) {
                accessibilityData[category].push(checkbox.nextSibling.textContent.trim());
            }
        });
        
        this.formData.accessibility_features = JSON.stringify(accessibilityData);
        this.saveDraft();
    }

    /**
     * Clear all dynamic fields
     */
    clearDynamicFields() {
        const container = document.getElementById('dynamic-fields');
        if (container) {
            container.innerHTML = '';
        }
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
            if (!this.formData.price_item || !this.formData.price_mvr || !this.formData.in_stock) {
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
        
        if (this.formData.subcategory === 'streetlight') {
            if (!this.formData.light_working) {
                this.showError('Please indicate if the streetlight is working.');
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
            
            // Submit to endpoint (Google Apps Script or Formspree)
            const response = await fetch(this.config.endpoint_url, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Handle different response formats
            let result;
            try {
                result = await response.json();
            } catch (e) {
                // Formspree returns HTML, not JSON
                if (response.ok) {
                    result = { success: true };
                } else {
                    throw new Error('Submission failed');
                }
            }
            
            if (result.success || response.ok) {
                // Clear draft and show success
                this.clearDraft();
                this.showScreen('success-screen');
            } else {
                throw new Error(result.error || 'Submission failed');
            }
            
        } catch (error) {
            console.error('Submission error:', error);
            
            // Try fallback storage
            const fallbackSuccess = await this.tryFallbackStorage(submissionData);
            
            if (fallbackSuccess) {
                this.clearDraft();
                this.showScreen('success-screen');
            } else {
                this.showError('Failed to submit data. Your entry has been saved locally and will be retried later.');
            }
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Try fallback storage when main submission fails
     * @param {Object} submissionData - Data to store
     * @returns {boolean} - True if successful
     */
    async tryFallbackStorage(submissionData) {
        try {
            // Store in localStorage as fallback
            const fallbackKey = `mappingApp_fallback_${submissionData.submission_id}`;
            const fallbackData = {
                ...submissionData,
                stored_at: new Date().toISOString(),
                photos: this.formData.photos.map((photo, index) => ({
                    name: photo.name,
                    size: photo.size,
                    type: photo.type,
                    // Store as base64 for fallback
                    data: await this.fileToBase64(photo)
                }))
            };
            
            localStorage.setItem(fallbackKey, JSON.stringify(fallbackData));
            
            // Also store in a list of pending submissions
            const pendingKey = 'mappingApp_pending_submissions';
            const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]');
            pending.push(submissionData.submission_id);
            localStorage.setItem(pendingKey, JSON.stringify(pending));
            
            console.log('Data saved to fallback storage:', submissionData.submission_id);
            return true;
            
        } catch (error) {
            console.error('Fallback storage failed:', error);
            return false;
        }
    }

    /**
     * Convert file to base64 for storage
     * @param {File} file - File to convert
     * @returns {Promise<string>} - Base64 string
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Retry pending submissions
     */
    async retryPendingSubmissions() {
        const pendingKey = 'mappingApp_pending_submissions';
        const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]');
        
        if (pending.length === 0) return;
        
        console.log(`Retrying ${pending.length} pending submissions...`);
        
        for (const submissionId of pending) {
            try {
                const fallbackKey = `mappingApp_fallback_${submissionId}`;
                const fallbackData = JSON.parse(localStorage.getItem(fallbackKey));
                
                if (fallbackData) {
                    // Try to resubmit
                    const formData = new FormData();
                    formData.append('data', JSON.stringify(fallbackData));
                    
                    const response = await fetch(this.config.endpoint_url, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (response.ok) {
                        // Success - remove from pending
                        localStorage.removeItem(fallbackKey);
                        const updatedPending = pending.filter(id => id !== submissionId);
                        localStorage.setItem(pendingKey, JSON.stringify(updatedPending));
                        console.log(`Successfully resubmitted: ${submissionId}`);
                    }
                }
            } catch (error) {
                console.error(`Failed to retry submission ${submissionId}:`, error);
            }
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
            notes: this.formData.notes || '',
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
                photos: []
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
            photos: []
        };
        
        // Reset form elements
        document.getElementById('subcategory-select').selectedIndex = 0;
        document.getElementById('notes-input').value = '';
        document.getElementById('photo-preview').innerHTML = '';
        
        // Hide all sections
        document.getElementById('selected-category').style.display = 'none';
        document.getElementById('subcategory-section').style.display = 'none';
        document.getElementById('notes-section').style.display = 'none';
        document.getElementById('tags-section').style.display = 'none';
        document.getElementById('photos-section').style.display = 'none';
        document.getElementById('submit-section').style.display = 'none';
        
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
