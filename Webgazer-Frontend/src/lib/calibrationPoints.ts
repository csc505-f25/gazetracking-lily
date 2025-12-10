// Calibration points positioned to surround the screen edges
// Pattern: 4 corners + 4 edge midpoints + 1 center = 9 points
export const CAL_POINTS: [number, number][] = [
	// Corners (5% from edges for better clickability)
	[5, 5], // Top-left (positioned to the right of video overlay)
	[95, 5], // Top-right
	[5, 95], // Bottom-left
	[95, 95], // Bottom-right
	// Edge midpoints
	[50, 5], // Top-center
	[95, 50], // Right-center
	[50, 95], // Bottom-center
	[5, 50], // Left-center
	// Center
	[50, 50] // Center
];
