export default function LayerPanel({ layers, onToggleLayer, onRemoveLayer, onClearAll }) {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Layers ({layers.length})</h3>
        {layers.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Clear All
          </button>
        )}
      </div>

      {layers.length === 0 ? (
        <p className="text-gray-500 text-sm">No layers loaded. Upload a KML/KMZ file to get started.</p>
      ) : (
        <div className="space-y-2">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
            >
              <div className="flex items-center flex-1">
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => onToggleLayer(layer.id)}
                  className="mr-3"
                />
                <span className="text-sm text-gray-700 truncate flex-1" title={layer.name}>
                  {layer.name}
                </span>
              </div>
              <button
                onClick={() => onRemoveLayer(layer.id)}
                className="ml-2 text-red-600 hover:text-red-800 text-sm"
                title="Remove layer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

