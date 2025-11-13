import { Location } from './Location';

/**
 * Internal representation of a location node in the spatial graph
 */
interface MapNode {
  locationId: string;
  locationName: string;
  x: number;
  y: number;
  isCurrent: boolean;
  exits: Map<string, string>;
  hasUpExit: boolean;
  hasDownExit: boolean;
}

/**
 * Internal representation of a grid cell for ASCII rendering
 */
interface GridCell {
  type: 'empty' | 'location' | 'connection';
  content: string;
  locationId?: string;
  isCurrent?: boolean;
}

/**
 * MapRenderer generates ASCII-based visual representations of visited locations
 * and their spatial relationships based on directional exits.
 */
export class MapRenderer {
  private locations: Map<string, Location>;
  private visitedLocationIds: string[];
  private currentLocationId: string;

  constructor(
    locations: Map<string, Location>,
    visitedLocationIds: string[],
    currentLocationId: string
  ) {
    this.locations = locations;
    this.visitedLocationIds = visitedLocationIds;
    this.currentLocationId = currentLocationId;
  }

  /**
   * Generate complete map output including grid and legend
   */
  render(): string[] {
    const output: string[] = [];
    
    // Handle edge case: no visited locations
    if (this.visitedLocationIds.length === 0) {
      output.push('No locations visited yet.');
      return output;
    }

    // Build spatial graph
    const nodes = this.buildSpatialGraph();
    
    // Render the grid
    const grid = this.renderGrid(nodes);
    output.push(...grid);
    
    // Add spacing
    output.push('');
    
    // Render legend
    const legend = this.renderLegend();
    output.push(...legend);
    
    return output;
  }

  /**
   * Build spatial graph by calculating relative positions of visited locations
   * based on exit directions
   */
  private buildSpatialGraph(): MapNode[] {
    const nodes: MapNode[] = [];
    const positionMap = new Map<string, { x: number; y: number }>();
    
    // Start with the first visited location at origin
    const firstLocationId = this.visitedLocationIds[0];
    positionMap.set(firstLocationId, { x: 0, y: 0 });
    
    // Process all visited locations
    for (const locationId of this.visitedLocationIds) {
      const location = this.locations.get(locationId);
      if (!location) continue;
      
      // Get or assign position for this location
      let position = positionMap.get(locationId);
      if (!position) {
        // If no position yet, place it near origin
        position = { x: 0, y: 0 };
        positionMap.set(locationId, position);
      }
      
      // Process exits to calculate neighbor positions
      const exits = location.getExits();
      exits.forEach((targetId, direction) => {
        // Only process if target is also visited
        if (!this.visitedLocationIds.includes(targetId)) return;
        
        // Calculate target position based on direction
        const targetPos = this.calculateTargetPosition(position!, direction);
        
        // Set position if not already set
        if (!positionMap.has(targetId)) {
          positionMap.set(targetId, targetPos);
        }
      });
    }
    
    // Create nodes from positions
    for (const locationId of this.visitedLocationIds) {
      const location = this.locations.get(locationId);
      if (!location) continue;
      
      const position = positionMap.get(locationId)!;
      const exits = location.getExits();
      
      // Filter exits to only include visited locations
      const visitedExits = new Map<string, string>();
      exits.forEach((targetId, direction) => {
        if (this.visitedLocationIds.includes(targetId)) {
          visitedExits.set(direction, targetId);
        }
      });
      
      nodes.push({
        locationId,
        locationName: location.name,
        x: position.x,
        y: position.y,
        isCurrent: locationId === this.currentLocationId,
        exits: visitedExits,
        hasUpExit: exits.has('up'),
        hasDownExit: exits.has('down')
      });
    }
    
    return nodes;
  }

  /**
   * Calculate target position based on direction from current position
   */
  private calculateTargetPosition(
    from: { x: number; y: number },
    direction: string
  ): { x: number; y: number } {
    switch (direction.toLowerCase()) {
      case 'north':
        return { x: from.x, y: from.y - 1 };
      case 'south':
        return { x: from.x, y: from.y + 1 };
      case 'east':
        return { x: from.x + 1, y: from.y };
      case 'west':
        return { x: from.x - 1, y: from.y };
      default:
        // up/down don't affect 2D position
        return { x: from.x, y: from.y };
    }
  }

  /**
   * Convert spatial graph into ASCII character grid
   */
  private renderGrid(nodes: MapNode[]): string[] {
    if (nodes.length === 0) {
      return ['No locations to display.'];
    }
    
    // Find bounds
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y));
    
    // Calculate grid dimensions (each location takes 3 chars width, 1 char height)
    // Connections take 4 chars between locations
    const gridWidth = (maxX - minX + 1) * 7;
    const gridHeight = (maxY - minY + 1) * 2;
    
    // Initialize grid
    const grid: GridCell[][] = [];
    for (let y = 0; y < gridHeight; y++) {
      grid[y] = [];
      for (let x = 0; x < gridWidth; x++) {
        grid[y][x] = { type: 'empty', content: ' ' };
      }
    }
    
    // Place locations and connections
    for (const node of nodes) {
      const gridX = (node.x - minX) * 7 + 1;
      const gridY = (node.y - minY) * 2;
      
      // Place location marker
      const marker = node.isCurrent ? '[@]' : '[*]';
      const upDown = node.hasUpExit && node.hasDownExit ? '↕' :
                     node.hasUpExit ? '↑' :
                     node.hasDownExit ? '↓' : '';
      
      grid[gridY][gridX] = { type: 'location', content: marker[0], locationId: node.locationId, isCurrent: node.isCurrent };
      grid[gridY][gridX + 1] = { type: 'location', content: marker[1], locationId: node.locationId, isCurrent: node.isCurrent };
      grid[gridY][gridX + 2] = { type: 'location', content: marker[2], locationId: node.locationId, isCurrent: node.isCurrent };
      
      if (upDown) {
        grid[gridY][gridX + 3] = { type: 'location', content: upDown, locationId: node.locationId };
      }
      
      // Draw connections to neighbors
      node.exits.forEach((targetId, direction) => {
        const targetNode = nodes.find(n => n.locationId === targetId);
        if (!targetNode) return;
        
        switch (direction.toLowerCase()) {
          case 'east':
            // Draw horizontal line to the right
            for (let i = 1; i <= 3; i++) {
              grid[gridY][gridX + 3 + i] = { type: 'connection', content: '─' };
            }
            break;
          case 'south':
            // Draw vertical line down
            grid[gridY + 1][gridX + 1] = { type: 'connection', content: '│' };
            break;
        }
      });
    }
    
    // Convert grid to strings
    const output: string[] = [];
    output.push('=== Map ===');
    output.push('');
    
    for (let y = 0; y < gridHeight; y++) {
      let line = '';
      for (let x = 0; x < gridWidth; x++) {
        line += grid[y][x].content;
      }
      // Trim trailing spaces
      line = line.trimEnd();
      if (line.length > 0) {
        output.push(line);
      }
    }
    
    return output;
  }

  /**
   * Generate map legend explaining symbols
   */
  private renderLegend(): string[] {
    const legend: string[] = [];
    
    legend.push('Legend:');
    legend.push('  [@] - Your location');
    legend.push('  [*] - Visited location');
    legend.push('  │─  - Connections');
    legend.push('  ↑↓  - Up/Down exits');
    legend.push('');
    legend.push(`Locations visited: ${this.visitedLocationIds.length}`);
    
    return legend;
  }
}
