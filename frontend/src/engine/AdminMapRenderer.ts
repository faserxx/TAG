import { Location } from './Location';

/**
 * AdminMapRenderer generates text-based visual representations of all locations
 * in an adventure and their connections, designed for admin mode inspection.
 * Unlike the player MapRenderer, this shows ALL locations regardless of visit status.
 */
export class AdminMapRenderer {
  private locations: Map<string, Location>;
  private selectedLocationId: string | null;

  constructor(
    locations: Map<string, Location>,
    selectedLocationId: string | null = null
  ) {
    this.locations = locations;
    this.selectedLocationId = selectedLocationId;
  }

  /**
   * Generate complete map output showing all locations and their connections
   */
  render(): string[] {
    const output: string[] = [];
    
    // Handle edge case: no locations
    if (this.locations.size === 0) {
      output.push('No locations in this adventure.');
      return output;
    }

    output.push('=== Adventure Map ===');
    output.push('');
    
    // Build a graph of location connections
    const visited = new Set<string>();
    const locationArray = Array.from(this.locations.values());
    
    // Start with the first location and traverse the graph
    if (locationArray.length > 0) {
      this.renderLocationTree(locationArray[0].id, visited, output, 0);
    }
    
    // Render any disconnected locations
    for (const location of locationArray) {
      if (!visited.has(location.id)) {
        output.push('');
        output.push('--- Disconnected ---');
        this.renderLocationTree(location.id, visited, output, 0);
      }
    }
    
    output.push('');
    output.push(`Total locations: ${this.locations.size}`);
    output.push('');
    output.push('Legend:');
    output.push('  [*] - Selected location');
    output.push('  →   - Connection direction');
    
    return output;
  }

  /**
   * Recursively render a location and its connected neighbors
   */
  private renderLocationTree(
    locationId: string,
    visited: Set<string>,
    output: string[],
    depth: number
  ): void {
    // Avoid infinite loops
    if (visited.has(locationId)) {
      return;
    }
    
    visited.add(locationId);
    
    const location = this.locations.get(locationId);
    if (!location) {
      return;
    }
    
    // Create indentation
    const indent = '  '.repeat(depth);
    
    // Mark selected location
    const marker = locationId === this.selectedLocationId ? '[*]' : '[ ]';
    
    // Render location name and ID
    output.push(`${indent}${marker} ${location.name} (${location.id})`);
    
    // Render exits with arrows
    const exits = location.getExits();
    if (exits.size > 0) {
      const exitLines: string[] = [];
      
      exits.forEach((targetId, direction) => {
        const targetLocation = this.locations.get(targetId);
        const targetName = targetLocation ? targetLocation.name : targetId;
        exitLines.push(`${direction} → ${targetName}`);
      });
      
      output.push(`${indent}    Exits: ${exitLines.join(', ')}`);
    }
    
    // Recursively render connected locations (only north/south/east/west for tree structure)
    const primaryDirections = ['north', 'south', 'east', 'west'];
    exits.forEach((targetId, direction) => {
      if (primaryDirections.includes(direction.toLowerCase()) && !visited.has(targetId)) {
        this.renderLocationTree(targetId, visited, output, depth + 1);
      }
    });
  }
}
