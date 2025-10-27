# Lap Analyzer

A web-based application for analyzing and comparing lap data from FIT files, with advanced lap editing capabilities.

## Features

- 📁 **Multiple FIT File Support**: Load and analyze multiple FIT files simultaneously
- ✂️ **Custom Lap Creation**: Create custom laps by selecting time ranges on an interactive timeline
- 🗺️ **GPS Map Visualization**: View your activities on an interactive map with lap-specific coloring
- 📊 **Lap-by-Lap Comparison**: Compare performance metrics across different laps
- 📈 **Detailed Analysis**: Heart rate, power, cadence, speed, and elevation analysis
- ⏱️ **Time Difference Calculations**: Precise time comparisons between lap segments
- 🎯 **Interactive Timeline**: Drag and drop to create precise lap boundaries
- 🎨 **Visual Feedback**: Real-time preview of lap selections on both timeline and map

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/abvaden/FitFileLapAnalyzer.git
   cd FitFileLapAnalyzer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Loading FIT Files

1. Click the file upload area or drag and drop FIT files
2. Multiple files can be loaded simultaneously
3. Files will be parsed and laps automatically extracted

### Custom Lap Creation

1. Click on any loaded FIT file to open the Lap Editor
2. Use the interactive timeline to select time ranges
3. Click "Create Lap" to create custom lap segments
4. View your selections in real-time on the GPS map
5. Rename, edit, or delete laps as needed

### Analyzing Data

1. Select laps from different files for comparison
2. Use the comparison charts to analyze performance differences
3. View detailed time analysis and metrics
4. Export or save your analysis results

## Supported File Formats

- **.fit** - Garmin FIT files (primary support)
- All standard FIT file variations from cycling computers, fitness watches, and other devices

## Technology Stack

- **Frontend**: Vue 3 + TypeScript
- **State Management**: Pinia
- **Charts**: Chart.js + Vue-ChartJS
- **Maps**: Leaflet
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **FIT File Parsing**: fit-file-parser

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI

### Project Structure

```
src/
├── components/           # Vue components
│   ├── FileUploader.vue     # File upload interface
│   ├── FileList.vue         # Loaded files display
│   ├── LapEditModal.vue     # Lap editing modal
│   ├── TimelineEditor.vue   # Interactive timeline
│   ├── LapEditMapView.vue   # GPS map component
│   └── ...
├── stores/              # Pinia stores
│   ├── fitFiles.ts         # FIT file state management
│   └── comparison.ts       # Lap comparison logic
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── ...
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with Vue 3 and modern web technologies
- FIT file parsing powered by fit-file-parser
- Maps provided by OpenStreetMap and Leaflet
- UI components styled with Tailwind CSS
