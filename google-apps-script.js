/**
 * Google Apps Script backend for the mapping app
 * Receives form submissions and stores them in Google Sheets
 * Also handles photo uploads to Google Drive
 */

// Configuration - Update these with your actual IDs
const CONFIG = {
  // Google Sheet ID where data will be stored
  SHEET_ID: '1WW0sdfSwtQ0H5RS6QqxxiE7T0IF_nz_rSzxYOEXtU7Q',
  
  // Google Drive folder ID where photos will be stored
  DRIVE_FOLDER_ID: '1Kz4w9W-yGmruj1ItPBRPfz3-WVEJJIXc',
  
  // Sheet name within the spreadsheet
  SHEET_NAME: 'submissions',
  
  // Allowed domains for CORS (update with your domain)
  ALLOWED_ORIGINS: ['https://island-mapping-tool.vercel.app/', 'http://island-mapping-tool.vercel.app/', 'http://localhost:3000']
};

/**
 * Main doPost function - handles incoming form submissions
 * This is the entry point for all POST requests to the web app
 */
function doPost(e) {
  try {
    // Set CORS headers to allow requests from your domain
    setCorsHeaders();
    
    // Parse the incoming data
    const formData = parseFormData(e);
    
    // Validate the submission data
    const validationResult = validateSubmission(formData.data);
    if (!validationResult.valid) {
      return createErrorResponse(validationResult.error, 400);
    }
    
    // Process photos and get URLs
    const photoUrls = processPhotos(formData.photos, formData.data.submission_id);
    
    // Add photo URLs to the submission data
    const submissionData = addPhotoUrlsToData(formData.data, photoUrls);
    
    // Append data to Google Sheet
    const sheetResult = appendToSheet(submissionData);
    
    if (sheetResult.success) {
      return createSuccessResponse({
        message: 'Submission received successfully',
        submission_id: submissionData.submission_id,
        row_number: sheetResult.rowNumber
      });
    } else {
      return createErrorResponse('Failed to save to sheet: ' + sheetResult.error, 500);
    }
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return createErrorResponse('Internal server error: ' + error.message, 500);
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  setCorsHeaders();
  return ContentService.createTextOutput(JSON.stringify({
    message: 'Mapping app backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Set CORS headers to allow cross-origin requests
 */
function setCorsHeaders() {
  // Note: CORS headers in Apps Script are limited
  // You may need to deploy as a web app with proper permissions
}

/**
 * Parse form data from the incoming request
 * @param {Object} e - The event object from doPost
 * @returns {Object} - Parsed form data with JSON data and photo files
 */
function parseFormData(e) {
  const result = {
    data: null,
    photos: []
  };
  
  // Parse multipart form data
  const boundary = e.parameter.boundary || '----WebKitFormBoundary';
  const body = e.postData.contents;
  
  if (!body) {
    throw new Error('No data received');
  }
  
  // Split by boundary
  const parts = body.split('--' + boundary);
  
  for (let part of parts) {
    if (part.includes('Content-Disposition: form-data')) {
      if (part.includes('name="data"')) {
        // Extract JSON data
        const jsonStart = part.indexOf('{');
        const jsonEnd = part.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = part.substring(jsonStart, jsonEnd);
          result.data = JSON.parse(jsonString);
        }
      } else if (part.includes('name="photo_')) {
        // Extract photo file
        const photoData = extractPhotoData(part);
        if (photoData) {
          result.photos.push(photoData);
        }
      }
    }
  }
  
  if (!result.data) {
    throw new Error('No JSON data found in request');
  }
  
  return result;
}

/**
 * Extract photo data from multipart form part
 * @param {string} part - The multipart form part containing photo data
 * @returns {Object|null} - Photo data object or null if extraction fails
 */
function extractPhotoData(part) {
  try {
    // Find the start of the file data (after headers)
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) return null;
    
    const fileData = part.substring(headerEnd + 4);
    
    // Extract filename from headers
    const filenameMatch = part.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : 'photo.jpg';
    
    return {
      filename: filename,
      data: fileData,
      contentType: 'image/jpeg'
    };
  } catch (error) {
    console.error('Error extracting photo data:', error);
    return null;
  }
}

/**
 * Validate submission data
 * @param {Object} data - The submission data to validate
 * @returns {Object} - Validation result with valid flag and error message
 */
function validateSubmission(data) {
  const requiredFields = [
    'submission_id', 'submitted_at_iso', 'lat', 'lon', 
    'category', 'subcategory', 'consent_confirmed'
  ];
  
  // Check required fields
  for (let field of requiredFields) {
    if (!data[field]) {
      return {
        valid: false,
        error: `Missing required field: ${field}`
      };
    }
  }
  
  // Validate coordinates
  const lat = parseFloat(data.lat);
  const lon = parseFloat(data.lon);
  
  if (isNaN(lat) || lat < -90 || lat > 90) {
    return {
      valid: false,
      error: 'Invalid latitude value'
    };
  }
  
  if (isNaN(lon) || lon < -180 || lon > 180) {
    return {
      valid: false,
      error: 'Invalid longitude value'
    };
  }
  
  // Validate consent
  if (data.consent_confirmed !== 'yes') {
    return {
      valid: false,
      error: 'Consent not confirmed'
    };
  }
  
  return { valid: true };
}

/**
 * Process uploaded photos and save them to Google Drive
 * @param {Array} photos - Array of photo data objects
 * @param {string} submissionId - Unique submission ID for naming
 * @returns {Array} - Array of photo URLs
 */
function processPhotos(photos, submissionId) {
  const photoUrls = [];
  
  if (!photos || photos.length === 0) {
    return photoUrls;
  }
  
  try {
    // Get the target folder
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    
    photos.forEach((photo, index) => {
      try {
        // Create filename with submission ID
        const filename = `${submissionId}_${index + 1}.jpg`;
        
        // Create blob from photo data
        const blob = Utilities.newBlob(
          Utilities.base64Decode(photo.data),
          photo.contentType,
          filename
        );
        
        // Upload to Drive
        const file = folder.createFile(blob);
        
        // Set file permissions to public (optional)
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        // Get public URL
        const url = file.getUrl();
        photoUrls.push(url);
        
        console.log(`Photo ${index + 1} uploaded: ${url}`);
        
      } catch (photoError) {
        console.error(`Error processing photo ${index + 1}:`, photoError);
        // Continue processing other photos even if one fails
      }
    });
    
  } catch (error) {
    console.error('Error processing photos:', error);
    // Don't fail the entire submission if photos fail
  }
  
  return photoUrls;
}

/**
 * Add photo URLs to submission data
 * @param {Object} data - Original submission data
 * @param {Array} photoUrls - Array of photo URLs
 * @returns {Object} - Updated submission data with photo URLs
 */
function addPhotoUrlsToData(data, photoUrls) {
  const result = { ...data };
  
  // Add photo URLs to the data
  photoUrls.forEach((url, index) => {
    result[`photo_${index + 1}_url`] = url;
  });
  
  // Fill remaining photo URL fields with empty strings
  for (let i = photoUrls.length; i < 5; i++) {
    result[`photo_${i + 1}_url`] = '';
  }
  
  return result;
}

/**
 * Append submission data to Google Sheet
 * @param {Object} data - Submission data to append
 * @returns {Object} - Result with success flag and row number or error
 */
function appendToSheet(data) {
  try {
    // Open the spreadsheet and sheet
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
      // Add headers
      addSheetHeaders(sheet);
    }
    
    // Prepare row data in the correct order
    const rowData = prepareRowData(data);
    
    // Append the row
    sheet.appendRow(rowData);
    
    // Get the row number
    const lastRow = sheet.getLastRow();
    
    console.log(`Data appended to row ${lastRow}`);
    
    return {
      success: true,
      rowNumber: lastRow
    };
    
  } catch (error) {
    console.error('Error appending to sheet:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add headers to the sheet if it's new
 * @param {Sheet} sheet - The Google Sheet object
 */
function addSheetHeaders(sheet) {
  const headers = [
    'submission_id',
    'submitted_at_iso',
    'app_version',
    'language',
    'lat',
    'lon',
    'gps_accuracy_m',
    'category',
    'subcategory',
    'tags',
    'title_or_name',
    'notes',
    'photo_1_url',
    'photo_2_url',
    'photo_3_url',
    'photo_4_url',
    'photo_5_url',
    'contact_name',
    'contact_phone',
    'contact_other',
    'price_item',
    'price_mvr',
    'in_stock',
    'med_item',
    'med_availability',
    'med_price_mvr',
    'insulin_cold_chain',
    'light_working',
    'lux_ground',
    'hazard_type',
    'access_features',
    'isp',
    'down_mbps',
    'up_mbps',
    'ping_ms',
    'data_price_mvr_gb',
    'sample_type',
    'ph',
    'tds_ppm',
    'smell',
    'color',
    'pm25',
    'pm10',
    'noise_db',
    'temp_c',
    'rh',
    'project_type',
    'progress_status',
    'contractor',
    'mode',
    'operator_name',
    'days_of_week',
    'submitter_nickname',
    'consent_confirmed',
    'ip_hash'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f0f0f0');
}

/**
 * Prepare row data in the correct column order
 * @param {Object} data - Submission data
 * @returns {Array} - Array of values in the correct order
 */
function prepareRowData(data) {
  return [
    data.submission_id || '',
    data.submitted_at_iso || '',
    data.app_version || '',
    data.language || '',
    data.lat || '',
    data.lon || '',
    data.gps_accuracy_m || '',
    data.category || '',
    data.subcategory || '',
    data.tags || '',
    data.title_or_name || '',
    data.notes || '',
    data.photo_1_url || '',
    data.photo_2_url || '',
    data.photo_3_url || '',
    data.photo_4_url || '',
    data.photo_5_url || '',
    data.contact_name || '',
    data.contact_phone || '',
    data.contact_other || '',
    data.price_item || '',
    data.price_mvr || '',
    data.in_stock || '',
    data.med_item || '',
    data.med_availability || '',
    data.med_price_mvr || '',
    data.insulin_cold_chain || '',
    data.light_working || '',
    data.lux_ground || '',
    data.hazard_type || '',
    data.access_features || '',
    data.isp || '',
    data.down_mbps || '',
    data.up_mbps || '',
    data.ping_ms || '',
    data.data_price_mvr_gb || '',
    data.sample_type || '',
    data.ph || '',
    data.tds_ppm || '',
    data.smell || '',
    data.color || '',
    data.pm25 || '',
    data.pm10 || '',
    data.noise_db || '',
    data.temp_c || '',
    data.rh || '',
    data.project_type || '',
    data.progress_status || '',
    data.contractor || '',
    data.mode || '',
    data.operator_name || '',
    data.days_of_week || '',
    data.submitter_nickname || '',
    data.consent_confirmed || '',
    data.ip_hash || ''
  ];
}

/**
 * Create success response
 * @param {Object} data - Response data
 * @returns {TextOutput} - Success response
 */
function createSuccessResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    ...data
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Create error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {TextOutput} - Error response
 */
function createErrorResponse(message, statusCode = 400) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message,
    statusCode: statusCode
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test function to verify the script is working
 * Run this function to test the setup
 */
function testSetup() {
  try {
    // Test spreadsheet access
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    console.log('Spreadsheet access: OK');
    
    // Test Drive folder access
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    console.log('Drive folder access: OK');
    
    // Test sheet creation
    let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
      addSheetHeaders(sheet);
      console.log('Sheet created: OK');
    } else {
      console.log('Sheet exists: OK');
    }
    
    console.log('All tests passed! The script is ready to use.');
    
  } catch (error) {
    console.error('Setup test failed:', error);
    console.error('Please check your CONFIG values and permissions.');
  }
}
