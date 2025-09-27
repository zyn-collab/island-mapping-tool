# Community Mapping Tool

A simple, zero-login, mobile-first web tool for community-driven data collection. It allows anyone with a link to add a geotagged note with categories, details, and photos to a private map, which feeds directly into a Google Sheet for analysis.

## Why have an island mapping tool?

In many places, especially on small islands or in remote communities, there is a lack of up-to-date, granular data about local services, infrastructure, and economic activity. This information gap makes it difficult for policymakers, entrepreneurs, and community leaders to make informed decisions. This tool is designed to bridge that gap. By making mapping and logging information with exact coordinates easy, it creates a rich dataset that can be used for:

* **Business and Economic Planning**: Identify gaps in the market by seeing where essential businesses like bakeries, hardware stores, or pharmacies are missing. Entrepreneurs can use this data to build a business case for a new venture. Government can support potential entrepreneurs or SMEs in making business plans or applying for loans by using this data.
* **Market Access for Island Businesses:** Most island businesses have no web presence, social media page, or even a Google Maps entry which would let anyone who doesn't come across them physically know to buy from them. With businesses mapped, especially with photos of the establishment and its items/menu/price list, we can make them at minimum a Google Maps entry that shows up on search, and ideally even develop small web pages or profiles with SEO for these businesses.
* **Public Infrastructure Management**: Pinpoint the exact location of potholes, broken streetlights, open drains, or areas prone to flooding. This produces data points that councils and public works departments can use to prioritize repairs.
* **Housing Mapping:** Dropping a pin for apartments or social housing with a photo and details of rental in the notes allows for detailed mapping of issues such as the differing rents or housing expenses or land values in islands, or mapping out vacant homes to identify supply availability dynamics due to internal migration and population outflow from islands.
* **Social Services Mapping**: Compile lists with locations of social services like disability centers, domestic violence shelters, or health clinics, making them more accessible to those in need. Information on these services within islands is hard to find online, so this can be used to create a card for each island with the nearest provider of each key social service along with details. This means that when anyone in the country asks for support and needs a service, we would be able to immediately inform them of all their options. In cases of government-insured healthcare needs, government insurance would be able to suggest service providers closer to their islands if aware of them, saving both the government and individual families the expense and hassle of long trips to the capital.
* **Enhancing Accessibility**: Log accessibility features like wheelchair ramps, step-free entrances, and accessible toilets, creating a resource that can be used by government bodies to identify and address accessibility needs. This can even be used by councils to request budgets or allocate block grants, supported through nonprofits or CSR, or rolled out within federal government programs.
* **Public Health Monitoring**: Track pharmacy stock for essential medicines, identify potential mosquito breeding sites (standing water), and monitor the operational hours of clinics.
* **Affordability Tracking**: Create a "price basket" of staple goods (rice, flour, oil, etc.) by logging prices at different shops, providing a clear picture of the cost of living. In particular, items most needed by families with young children (e.g. diapers, baby formula) provides information on the challenges faced by parents.
* **PSIP and Project Transparency**: Monitor the progress of Public Sector Investment Programme (PSIP) projects with geotagged photos, ensuring accountability and transparency.
* **Environmental Monitoring**: Collect hyperlocal data on water quality, air quality, heat, noise, and the locations of important natural features like shade trees.

A key principle is that this is **not a public complaint wall**. It's a shared log of what exists, what works, and what needs attention. The data is private to the project team, who can then clean, analyze, and visualize it to create valuable resources like service maps, heatmaps, and briefing notes.

## What can be mapped with this tool?

The tool is designed for maximum flexibility. A user in the field can map as much or as little as they want, and every single data point is valuable. You can conduct a comprehensive survey of an entire island, focus on just one category (like mapping all the pharmacies), or simply drop a few pins at interesting locations. The tool is useful with just a handful of entries and becomes even more powerful with thousands.

This flexibility extends to how you add information. You don't need to have structured details for every pin. Simply marking that "a bakery is here" is valuable on its own. If you have more details, you can add the name of the establishment, its opening hours, a contact number, or any other relevant information in the "Notes" section. The goal is to make data entry as fast and easy as possible; the detailed data cleaning and structuring will be handled by the project team from the Google Sheet afterward.

Here’s a breakdown of what you can map:

### Quick Drops

These are for very fast, high-frequency mapping. If you want to count every motorcycle on a street or map every single streetlight, these single-tap categories let you do that without filling out any other forms. You can quickly pin things like **working or broken streetlights**, **road depressions**, **potholes**, **rubble**, **broken-down vehicles**, or **vacant homes**.

### Categories

* **Businesses & Services**: This category helps map the local economy. You can pin every type of commercial activity, from bakeries, cafes, and supermarkets to tailors, mechanics, and hardware stores. This helps identify which services are available on an island and which are missing.
* **Public & Community**: Use this to map all public-facing services. This includes government buildings like the council office or police post, as well as essential public infrastructure like ATMs, post offices, banks, mosques, and schools.
* **Social Services**: This category is for mapping critical support systems that are often hard to find, such as disability services, family and child support centers, domestic violence shelters, and counseling or rehab centers.
* **Infrastructure & Utilities**: This is for the foundational infrastructure of the island. You can map public bins, benches, open drains, public toilets, telecom towers, and water or sewerage plants.
* **Transport & Travel**: Map the island's transport nodes, including ferry jetties, speedboat agents, cargo landing sites, and taxi stands. This is vital for understanding logistics and connectivity.
* **Environment & Hazards**: Identify risks and environmental features. This includes public safety issues like dark/unlit areas, standing water (mosquito breeding sites), open manholes, and flood spots, as well as environmental points of interest.
* **Staple Price Basket**: This is a special category for tracking affordability. You can log the prices of essential goods to understand the cost of living. It focuses particularly on items for parents and families, like baby formula, diapers, rice, flour, and milk.
* **Pharmacy Stock**: Shortages of common medicines are a frequent problem. This category lets you check for the availability of key medicines, including those crucial for the elderly (e.g., for blood pressure, cholesterol, diabetes) and for children (e.g., paracetamol syrup, ORS).
* **Health Facility Scan**: This allows for a quick audit of the services available at a local clinic or health center, including its posted hours and whether it has 24-hour emergency services.
* **Accessibility Check**: A detailed checklist to audit the accessibility of a public place like a council office, clinic, or mosque. It covers features like ramps, step-free entrances, handrails, and accessible toilets.
* **Plants & Trees**: Map the island's green cover, from important shade trees and fruit trees to mangroves.
* **PSIP / Public Works**: Track the progress of government infrastructure projects with geotagged photos, from harbor construction and road paving to new housing units or school buildings.
* **Internet Speed**: Log the results of an internet speed test at any given location.
* **Water / Air / Soil Tests**: For more technical fieldwork, this category allows you to log data from environmental testing kits.
* **Contacts & Local Info**: A place to store non-physical but location-relevant information, like contact number for the local ferry, the council office, or notes on local logistics. Saving as many contacts as possible is best, to be able to have sources we can ask to update data later.

## How It Works: The User's Perspective

The tool is designed to be very simple to use, with no login and minimal training required.

1. **Open the Link**: The user opens the app's URL on their mobile device.
2. **Start an Entry**: They tap a single button to begin.
3. **Confirm Location**: The app automatically detects their GPS location and displays it on a map. The user can drag the pin to refine the exact spot.
4. **Choose a Category**: A popup appears with clear icons for different categories (e.g., "Business," "Infrastructure," "Hazard").
5. **Add Details**: Based on the category, a simple form appears. The user selects a subcategory and fills in a few relevant fields.
6. **Add Notes and Photos**: The user can add a short, factual note and upload up to five photos (e.g., a picture of a pothole, a shop front, or a price tag).
7. **Submit**: With a final tap, the entry is sent. The data is securely transmitted to the project's Google Sheet.

The user never sees other people's entries, ensuring privacy and keeping the interface clean and focused on data submission without creating social media dynamics.

## Core Features

* **Zero-Login**: Anyone with the link can contribute, maximizing participation.
* **GPS Location Capture**: High-accuracy location with a user-friendly map interface (drag-and-drop pin).
* **Photo Uploads**: Users can add up to 5 photos, which are automatically compressed on the client-side to save data and speed up uploads.
* **Google Sheets & Drive Integration**: Data is stored in a structured way in a Google Sheet, with photos uploaded to a corresponding Google Drive folder.

## Data Model and Admin Workflow

All data is collected in a structured format in the Google Sheet. The columns are pre-defined and cover a wide range of potential data points, from GPS coordinates and notes to category-specific fields.

### Admin Workflow

The work of the project team begins after the data is submitted:

1. **Review Submissions**: The team regularly reviews new entries in the Google Sheet.
2. **Clean and Standardize**: They clean up text, standardize labels (e.g., ensuring "Main St" and "Main Street" are consistent), and verify the information.
3. **Analyze and Visualize**: The clean data can be exported as a CSV or GeoJSON file and imported into GIS software (like QGIS or ArcGIS) or data visualization tools (like Tableau).
4. **Create Outputs**: From this data, the team can create:
   * Public-facing service maps.
   * Heatmaps showing service gaps.
   * Dashboards for local councils.
   * Briefing pages for ministries.
   * Evidence-based reports to support policy changes.
   * And more.
