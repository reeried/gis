# GIS Viewer - KML/KMZ Map Viewer

A modern web application for viewing KML and KMZ files on an interactive map, similar to Google Earth.

## Features

- 📁 Upload KML and KMZ files via drag-and-drop or file browser
- 🌐 Load KML files from URLs (online mode)
- 💾 Server-side file storage - files persist across sessions and devices
- 🗺️ Interactive map with OpenStreetMap tiles
- 👁️ Toggle layer visibility
- 🗑️ Remove individual layers
- 📊 Display geographic features (points, lines, polygons)
- 💬 Popup information for features
- 🎨 Modern, responsive UI

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the backend server and frontend development server:
```bash
# Option 1: Run both servers together (recommended)
npm run dev:all

# Option 2: Run servers separately
# Terminal 1: Start backend server
npm run dev:server

# Terminal 2: Start frontend dev server
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

**Note:** The backend server runs on `http://localhost:3001` and handles file storage. KML files are saved in the `server/uploads` directory and persist across sessions and devices.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

For production, you'll need to:
1. Build the frontend: `npm run build`
2. Start the backend server: `npm start`
3. Serve the frontend (using a static file server like nginx or serve the `dist` folder)

## Usage

1. Click "Browse Files" or drag and drop a KML/KMZ file into the upload area
2. The file will be parsed and displayed on the map
3. Use the layer panel to:
   - Toggle layer visibility (checkbox)
   - Remove individual layers (✕ button)
   - Clear all layers

## Technologies Used

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **Leaflet** - Interactive maps
- **React-Leaflet** - React bindings for Leaflet
- **toGeoJSON** - KML to GeoJSON converter
- **JSZip** - KMZ (ZIP) file extraction
- **Tailwind CSS** - Styling

### Backend
- **Express** - Web server framework
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

## Supported File Formats

- `.kml` - Keyhole Markup Language files
- `.kmz` - Compressed KML files (ZIP archives)

## License

MIT

