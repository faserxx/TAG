import { describe, it, expect, beforeEach } from 'vitest';
import { AdminMapRenderer } from './AdminMapRenderer';
import { Location } from './Location';

describe('AdminMapRenderer', () => {
  let locations: Map<string, Location>;

  beforeEach(() => {
    locations = new Map();
  });

  describe('Basic rendering', () => {
    it('should render a single location', () => {
      const loc1 = new Location('loc1', 'Start Room', 'A starting room');
      locations.set('loc1', loc1);

      const renderer = new AdminMapRenderer(locations);
      const output = renderer.render();

      expect(output).toContain('=== Adventure Map ===');
      expect(output.some(line => line.includes('Start Room'))).toBe(true);
      expect(output.some(line => line.includes('Total locations: 1'))).toBe(true);
    });

    it('should handle no locations', () => {
      const renderer = new AdminMapRenderer(locations);
      const output = renderer.render();

      expect(output).toContain('No locations in this adventure.');
    });
  });

  describe('Selected location marking', () => {
    it('should mark selected location with [*]', () => {
      const loc1 = new Location('loc1', 'Room 1', 'First room');
      const loc2 = new Location('loc2', 'Room 2', 'Second room');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);

      const renderer = new AdminMapRenderer(locations, 'loc1');
      const output = renderer.render();

      expect(output.some(line => line.includes('[*]') && line.includes('Room 1'))).toBe(true);
    });

    it('should mark non-selected locations with [ ]', () => {
      const loc1 = new Location('loc1', 'Room 1', 'First room');
      const loc2 = new Location('loc2', 'Room 2', 'Second room');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);

      const renderer = new AdminMapRenderer(locations, 'loc1');
      const output = renderer.render();

      expect(output.some(line => line.includes('[ ]') && line.includes('Room 2'))).toBe(true);
    });
  });

  describe('Connection display', () => {
    it('should show all directional connections', () => {
      const loc1 = new Location('loc1', 'South Room', 'Southern room');
      const loc2 = new Location('loc2', 'North Room', 'Northern room');
      
      loc1.addExit('north', 'loc2');
      loc2.addExit('south', 'loc1');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);

      const renderer = new AdminMapRenderer(locations);
      const output = renderer.render();

      expect(output.some(line => line.includes('north → North Room'))).toBe(true);
      expect(output.some(line => line.includes('south → South Room'))).toBe(true);
    });

    it('should show multiple exits from a location', () => {
      const loc1 = new Location('loc1', 'Center', 'Center room');
      const loc2 = new Location('loc2', 'North', 'North room');
      const loc3 = new Location('loc3', 'East', 'East room');
      
      loc1.addExit('north', 'loc2');
      loc1.addExit('east', 'loc3');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);
      locations.set('loc3', loc3);

      const renderer = new AdminMapRenderer(locations);
      const output = renderer.render();

      expect(output.some(line => line.includes('north → North'))).toBe(true);
      expect(output.some(line => line.includes('east → East'))).toBe(true);
    });

    it('should show up and down exits', () => {
      const loc1 = new Location('loc1', 'Ground Floor', 'Ground level');
      const loc2 = new Location('loc2', 'Upper Floor', 'Upper level');
      
      loc1.addExit('up', 'loc2');
      loc2.addExit('down', 'loc1');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);

      const renderer = new AdminMapRenderer(locations);
      const output = renderer.render();

      expect(output.some(line => line.includes('up → Upper Floor'))).toBe(true);
      expect(output.some(line => line.includes('down → Ground Floor'))).toBe(true);
    });
  });

  describe('All locations visibility', () => {
    it('should show all locations regardless of connections', () => {
      const loc1 = new Location('loc1', 'Room 1', 'First room');
      const loc2 = new Location('loc2', 'Room 2', 'Second room');
      const loc3 = new Location('loc3', 'Room 3', 'Third room');
      
      // Only connect loc1 and loc2, leave loc3 disconnected
      loc1.addExit('north', 'loc2');
      loc2.addExit('south', 'loc1');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);
      locations.set('loc3', loc3);

      const renderer = new AdminMapRenderer(locations);
      const output = renderer.render();

      expect(output.some(line => line.includes('Room 1'))).toBe(true);
      expect(output.some(line => line.includes('Room 2'))).toBe(true);
      expect(output.some(line => line.includes('Room 3'))).toBe(true);
      expect(output.some(line => line.includes('Disconnected'))).toBe(true);
    });
  });

  describe('Legend', () => {
    it('should include legend with symbols', () => {
      const loc1 = new Location('loc1', 'Room', 'A room');
      locations.set('loc1', loc1);

      const renderer = new AdminMapRenderer(locations);
      const output = renderer.render();

      expect(output).toContain('Legend:');
      expect(output.some(line => line.includes('[*] - Selected location'))).toBe(true);
      expect(output.some(line => line.includes('→   - Connection direction'))).toBe(true);
    });

    it('should show correct total count', () => {
      const loc1 = new Location('loc1', 'Room 1', 'First');
      const loc2 = new Location('loc2', 'Room 2', 'Second');
      const loc3 = new Location('loc3', 'Room 3', 'Third');
      
      locations.set('loc1', loc1);
      locations.set('loc2', loc2);
      locations.set('loc3', loc3);

      const renderer = new AdminMapRenderer(locations);
      const output = renderer.render();

      expect(output.some(line => line.includes('Total locations: 3'))).toBe(true);
    });
  });

  describe('Location ID display', () => {
    it('should show location IDs in output', () => {
      const loc1 = new Location('loc1', 'Test Room', 'A test room');
      locations.set('loc1', loc1);

      const renderer = new AdminMapRenderer(locations);
      const output = renderer.render();

      expect(output.some(line => line.includes('(loc1)'))).toBe(true);
    });
  });
});
