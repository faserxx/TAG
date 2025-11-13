import { describe, it, expect, beforeEach } from 'vitest';
import { MapRenderer } from './MapRenderer';
import { Location } from './Location';

describe('MapRenderer', () => {
  let locations: Map<string, Location>;

  beforeEach(() => {
    locations = new Map();
  });

  describe('Single location rendering', () => {
    it('should render a single location', () => {
      const loc1 = new Location('loc1', 'Start Room', 'A starting room');
      locations.set('loc1', loc1);

      const renderer = new MapRenderer(locations, ['loc1'], 'loc1');
      const output = renderer.render();

      expect(output).toContain('=== Map ===');
      expect(output.some(line => line.includes('[@]'))).toBe(true);
      expect(output.some(line => line.includes('Your location'))).toBe(true);
      expect(output.some(line => line.includes('Locations visited: 1'))).toBe(true);
    });

    it('should handle no visited locations', () => {
      const renderer = new MapRenderer(locations, [], '');
      const output = renderer.render();

      expect(output).toContain('No locations visited yet.');
    });
  });

  describe('Linear path rendering', () => {
    it('should render north-south linear path', () => {
      const loc1 = new Location('loc1', 'South Room', 'Southern room');
      const loc2 = new Location('loc2', 'North Room', 'Northern room');
      
      loc1.addExit('north', 'loc2');
      loc2.addExit('south', 'loc1');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);

      const renderer = new MapRenderer(locations, ['loc1', 'loc2'], 'loc2');
      const output = renderer.render();

      expect(output).toContain('=== Map ===');
      expect(output.some(line => line.includes('[@]'))).toBe(true);
      expect(output.some(line => line.includes('[*]'))).toBe(true);
      expect(output.some(line => line.includes('│'))).toBe(true);
    });

    it('should render east-west linear path', () => {
      const loc1 = new Location('loc1', 'West Room', 'Western room');
      const loc2 = new Location('loc2', 'East Room', 'Eastern room');
      
      loc1.addExit('east', 'loc2');
      loc2.addExit('west', 'loc1');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);

      const renderer = new MapRenderer(locations, ['loc1', 'loc2'], 'loc1');
      const output = renderer.render();

      expect(output).toContain('=== Map ===');
      expect(output.some(line => line.includes('[@]'))).toBe(true);
      expect(output.some(line => line.includes('[*]'))).toBe(true);
      expect(output.some(line => line.includes('─'))).toBe(true);
    });
  });

  describe('Grid layout with intersections', () => {
    it('should render a 2x2 grid layout', () => {
      const loc1 = new Location('loc1', 'Southwest', 'SW room');
      const loc2 = new Location('loc2', 'Southeast', 'SE room');
      const loc3 = new Location('loc3', 'Northwest', 'NW room');
      const loc4 = new Location('loc4', 'Northeast', 'NE room');
      
      loc1.addExit('north', 'loc3');
      loc1.addExit('east', 'loc2');
      loc2.addExit('north', 'loc4');
      loc2.addExit('west', 'loc1');
      loc3.addExit('south', 'loc1');
      loc3.addExit('east', 'loc4');
      loc4.addExit('south', 'loc2');
      loc4.addExit('west', 'loc3');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);
      locations.set('loc3', loc3);
      locations.set('loc4', loc4);

      const renderer = new MapRenderer(
        locations,
        ['loc1', 'loc2', 'loc3', 'loc4'],
        'loc1'
      );
      const output = renderer.render();

      expect(output).toContain('=== Map ===');
      expect(output.some(line => line.includes('[@]'))).toBe(true);
      expect(output.filter(line => line.includes('[*]')).length).toBeGreaterThan(0);
      expect(output.some(line => line.includes('─'))).toBe(true);
      expect(output.some(line => line.includes('│'))).toBe(true);
    });
  });

  describe('Current location highlighting', () => {
    it('should highlight current location with [@]', () => {
      const loc1 = new Location('loc1', 'Room 1', 'First room');
      const loc2 = new Location('loc2', 'Room 2', 'Second room');
      
      loc1.addExit('east', 'loc2');
      loc2.addExit('west', 'loc1');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);

      const renderer = new MapRenderer(locations, ['loc1', 'loc2'], 'loc2');
      const output = renderer.render();

      const mapSection = output.slice(0, output.findIndex(line => line.includes('Legend')));
      const currentMarkerCount = mapSection.filter(line => line.includes('[@]')).length;
      const visitedMarkerCount = mapSection.filter(line => line.includes('[*]')).length;

      expect(currentMarkerCount).toBe(1);
      expect(visitedMarkerCount).toBeGreaterThan(0);
    });

    it('should mark non-current visited locations with [*]', () => {
      const loc1 = new Location('loc1', 'Room 1', 'First room');
      const loc2 = new Location('loc2', 'Room 2', 'Second room');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);

      const renderer = new MapRenderer(locations, ['loc1', 'loc2'], 'loc1');
      const output = renderer.render();

      expect(output.some(line => line.includes('[@]'))).toBe(true);
      expect(output.some(line => line.includes('[*]'))).toBe(true);
    });
  });

  describe('Up/Down exit indicators', () => {
    it('should show up arrow for up exit', () => {
      const loc1 = new Location('loc1', 'Ground Floor', 'Ground level');
      const loc2 = new Location('loc2', 'Upper Floor', 'Upper level');
      
      loc1.addExit('up', 'loc2');
      loc2.addExit('down', 'loc1');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);

      const renderer = new MapRenderer(locations, ['loc1', 'loc2'], 'loc1');
      const output = renderer.render();

      expect(output.some(line => line.includes('↑'))).toBe(true);
    });

    it('should show down arrow for down exit', () => {
      const loc1 = new Location('loc1', 'Upper Floor', 'Upper level');
      const loc2 = new Location('loc2', 'Ground Floor', 'Ground level');
      
      loc1.addExit('down', 'loc2');
      loc2.addExit('up', 'loc1');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);

      const renderer = new MapRenderer(locations, ['loc1'], 'loc1');
      const output = renderer.render();

      expect(output.some(line => line.includes('↓'))).toBe(true);
    });

    it('should show both arrows for up and down exits', () => {
      const loc1 = new Location('loc1', 'Middle Floor', 'Middle level');
      const loc2 = new Location('loc2', 'Upper Floor', 'Upper level');
      const loc3 = new Location('loc3', 'Lower Floor', 'Lower level');
      
      loc1.addExit('up', 'loc2');
      loc1.addExit('down', 'loc3');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);
      locations.set('loc3', loc3);

      const renderer = new MapRenderer(locations, ['loc1', 'loc2', 'loc3'], 'loc1');
      const output = renderer.render();

      expect(output.some(line => line.includes('↕'))).toBe(true);
    });
  });

  describe('Legend generation', () => {
    it('should include legend with all symbols', () => {
      const loc1 = new Location('loc1', 'Room', 'A room');
      locations.set('loc1', loc1);

      const renderer = new MapRenderer(locations, ['loc1'], 'loc1');
      const output = renderer.render();

      expect(output).toContain('Legend:');
      expect(output.some(line => line.includes('[@] - Your location'))).toBe(true);
      expect(output.some(line => line.includes('[*] - Visited location'))).toBe(true);
      expect(output.some(line => line.includes('│─  - Connections'))).toBe(true);
      expect(output.some(line => line.includes('↑↓  - Up/Down exits'))).toBe(true);
    });

    it('should show correct count of visited locations', () => {
      const loc1 = new Location('loc1', 'Room 1', 'First');
      const loc2 = new Location('loc2', 'Room 2', 'Second');
      const loc3 = new Location('loc3', 'Room 3', 'Third');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);
      locations.set('loc3', loc3);

      const renderer = new MapRenderer(locations, ['loc1', 'loc2', 'loc3'], 'loc1');
      const output = renderer.render();

      expect(output.some(line => line.includes('Locations visited: 3'))).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle long location names gracefully', () => {
      const loc1 = new Location(
        'loc1',
        'A Very Long Location Name That Exceeds Normal Length',
        'Description'
      );
      locations.set('loc1', loc1);

      const renderer = new MapRenderer(locations, ['loc1'], 'loc1');
      const output = renderer.render();

      expect(output).toContain('=== Map ===');
      expect(output.some(line => line.includes('[@]'))).toBe(true);
    });

    it('should handle large map with many locations', () => {
      // Create a 5x5 grid
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const id = `loc_${x}_${y}`;
          const loc = new Location(id, `Room ${x},${y}`, 'A room');
          
          if (x > 0) loc.addExit('west', `loc_${x-1}_${y}`);
          if (x < 4) loc.addExit('east', `loc_${x+1}_${y}`);
          if (y > 0) loc.addExit('north', `loc_${x}_${y-1}`);
          if (y < 4) loc.addExit('south', `loc_${x}_${y+1}`);
          
          locations.set(id, loc);
        }
      }

      const visitedIds = Array.from(locations.keys());
      const renderer = new MapRenderer(locations, visitedIds, 'loc_0_0');
      const output = renderer.render();

      expect(output).toContain('=== Map ===');
      expect(output.some(line => line.includes('Locations visited: 25'))).toBe(true);
    });

    it('should only show connections to visited locations', () => {
      const loc1 = new Location('loc1', 'Visited', 'Visited room');
      const loc2 = new Location('loc2', 'Unvisited', 'Unvisited room');
      
      loc1.addExit('north', 'loc2');
      loc2.addExit('south', 'loc1');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);

      const renderer = new MapRenderer(locations, ['loc1'], 'loc1');
      const output = renderer.render();

      // Should only show one location marker
      const mapSection = output.slice(0, output.findIndex(line => line.includes('Legend')));
      const locationMarkers = mapSection.filter(line => 
        line.includes('[@]') || line.includes('[*]')
      ).length;

      expect(locationMarkers).toBe(1);
    });
  });
});
