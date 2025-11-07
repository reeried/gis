# GIS Viewer - KML/KMZ Map Viewer

A modern web application for viewing KML and KMZ files on an interactive map, similar to Google Earth.

## Features

- 📁 Upload KML and KMZ files via drag-and-drop or file browser
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

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. Click "Browse Files" or drag and drop a KML/KMZ file into the upload area
2. The file will be parsed and displayed on the map
3. Use the layer panel to:
   - Toggle layer visibility (checkbox)
   - Remove individual layers (✕ button)
   - Clear all layers

## Technologies Used

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Leaflet** - Interactive maps
- **React-Leaflet** - React bindings for Leaflet
- **toGeoJSON** - KML to GeoJSON converter
- **JSZip** - KMZ (ZIP) file extraction
- **Tailwind CSS** - Styling

## Supported File Formats

- `.kml` - Keyhole Markup Language files
- `.kmz` - Compressed KML files (ZIP archives)

## License

MIT

