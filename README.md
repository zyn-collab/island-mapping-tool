# Mobile Mapping App

A zero-login, mobile-first web data-entry tool that captures GPS locations with category, notes, photos, and submits them to Google Sheets.

## Features

- **Mobile-first design** with clean, modern UI
- **GPS location capture** with high accuracy
- **Interactive map** with draggable pin placement
- **Dynamic forms** based on selected categories
- **Photo upload** with client-side compression
- **Offline support** with localStorage drafts
- **Google Sheets integration** via Apps Script
- **No user accounts** required

## Quick Start

### 1. Deploy the Frontend

1. Upload all files (`index.html`, `styles.css`, `app.js`, `config.json`) to a web server
2. Update the `endpoint_url` in `config.json` with your Google Apps Script URL

### 2. Set up Google Apps Script Backend

1. Go to [Google Apps Script](https://script.google.com)
2. Create a new project
3. Copy the code from `google-apps-script.js`
4. Update the CONFIG section with your IDs:
   - `SHEET_ID`: Your Google Sheet ID
   - `DRIVE_FOLDER_ID`: Google Drive folder for photos
5. Deploy as a web app with "Anyone" access
6. Copy the web app URL to your `config.json`

### 3. Create Google Sheet

Create a new Google Sheet and note its ID. The script will automatically create the `submissions` sheet with proper headers.

### 4. Set up Google Drive Folder

Create a folder in Google Drive for storing photos and note its ID.

## Configuration

### Frontend Config (`config.json`)

```json
{
  "app_version": "1.0.0",
  "language": "en",
  "max_photos": 5,
  "max_photo_size_mb": 2,
  "photo_compression_quality": 0.8,
  "photo_max_width": 1600,
  "endpoint_url": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
}
```

### Backend Config (in `google-apps-script.js`)

```javascript
const CONFIG = {
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
  DRIVE_FOLDER_ID: 'YOUR_DRIVE_FOLDER_ID',
  SHEET_NAME: 'submissions',
  ALLOWED_ORIGINS: ['https://yourdomain.com']
};
```

## Data Model

The app captures the following data structure:

### Core Fields
- `submission_id` (UUID v4)
- `submitted_at_iso` (UTC ISO 8601)
- `lat`, `lon` (decimal coordinates)
- `gps_accuracy_m` (integer)
- `category`, `subcategory` (enum codes)
- `tags` (semicolon-joined codes)
- `title_or_name` (free text)
- `notes` (free text, max 1000 chars)
- `photo_1_url` to `photo_5_url`
- `contact_name`, `contact_phone`, `contact_other`
- `consent_confirmed` (yes/no)
- `ip_hash` (SHA256 hash for deduplication)

### Category-Specific Fields
- **Price Basket**: `price_item`, `price_mvr`, `in_stock`
- **Pharmacy**: `med_item`, `med_availability`, `med_price_mvr`, `insulin_cold_chain`
- **Streetlight**: `light_working`, `lux_ground`
- **Internet**: `isp`, `down_mbps`, `up_mbps`, `ping_ms`
- **PSIP Projects**: `project_type`, `progress_status`, `contractor`
- And more...

## Categories

The app supports 15 main categories:

1. **Businesses & Services** - Shops, restaurants, services
2. **Public Services** - Government offices, hospitals, schools
3. **Social Services** - Shelters, counseling, disability services
4. **Infrastructure & Utilities** - Streetlights, bins, utilities
5. **Transport & Travel** - Ferries, speedboats, cargo
6. **Environment & Hazards** - Dark areas, standing water, hazards
7. **Staple Price Basket** - Essential goods pricing
8. **Pharmacy Stock** - Medicine availability
9. **Health Facility Scan** - Clinic services, hours
10. **Accessibility** - Access features for public spaces
11. **Plants & Trees** - Vegetation mapping
12. **PSIP / Public Works** - Infrastructure projects
13. **Internet Speed** - Speed test points
14. **Water / Air / Soil Tests** - Environmental testing
15. **Contacts & Local Info** - Local contacts and information

## Usage

1. **Open the app** on any mobile device
2. **Tap "Start a new entry"**
3. **Allow location access** or manually place pin
4. **Select category and subcategory**
5. **Fill in relevant fields** (dynamically shown)
6. **Add optional tags**
7. **Write notes** (up to 1000 characters)
8. **Take photos** (up to 5, compressed automatically)
9. **Submit** - data goes to Google Sheets

## Technical Details

### Frontend
- **Vanilla JavaScript** - No frameworks for simplicity
- **Leaflet.js** - Interactive maps with OpenStreetMap
- **Bootstrap 5** - Responsive UI components
- **Canvas API** - Client-side photo compression
- **Geolocation API** - GPS location capture
- **localStorage** - Draft saving and offline support

### Backend
- **Google Apps Script** - Serverless backend
- **Google Sheets API** - Data storage
- **Google Drive API** - Photo storage
- **Multipart form handling** - File upload support

### Security
- **Client-side IP hashing** - No raw IP storage
- **Input validation** - Server-side data validation
- **CORS protection** - Domain whitelisting
- **File type validation** - Image upload restrictions

## Browser Support

- **Modern mobile browsers** (iOS Safari, Chrome Mobile, Firefox Mobile)
- **GPS support** required for location features
- **File API support** for photo uploads
- **localStorage support** for drafts

## Deployment Options

### Static Hosting
- **Netlify** - Drag and drop deployment
- **Vercel** - Git-based deployment
- **GitHub Pages** - Free hosting
- **Any web server** - Upload files directly

### Custom Domain
Update the `ALLOWED_ORIGINS` in the Apps Script to include your domain.

## Troubleshooting

### Common Issues

1. **GPS not working**
   - Check browser permissions
   - Try manual location entry
   - Ensure HTTPS (required for GPS)

2. **Photos not uploading**
   - Check file size limits
   - Verify Drive folder permissions
   - Check Apps Script quotas

3. **Data not saving to Sheets**
   - Verify Sheet ID and permissions
   - Check Apps Script execution logs
   - Ensure proper deployment settings

### Testing

Run the `testSetup()` function in Apps Script to verify:
- Spreadsheet access
- Drive folder access
- Sheet creation
- Permissions

## Privacy & Consent

The app includes built-in consent mechanisms:
- Clear data usage explanation
- Optional face blurring for photos
- Client-side IP hashing (no raw IP storage)
- Community-focused data collection

## License

This project is open source. Feel free to modify and adapt for your community mapping needs.

## Support

For issues or questions:
1. Check the browser console for errors
2. Review Apps Script execution logs
3. Verify all configuration values
4. Test with the provided test functions
