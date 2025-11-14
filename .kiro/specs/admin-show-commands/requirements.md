# Requirements Document

## Introduction

This feature adds administrative commands to display and navigate game content in admin mode. Administrators need the ability to view all locations, characters, and items in the current adventure, as well as select a specific location to view its details. These commands enhance the admin experience by providing visibility into adventure content without requiring database queries.

## Glossary

- **Admin Mode**: An authenticated mode where users have elevated privileges to manage adventures
- **Terminal Interface**: The xterm.js-based UI that displays output and accepts commands
- **Command Parser**: The system component that interprets user input and routes commands
- **Game Engine**: The system component that manages game state and adventure data
- **Location**: A place in the adventure that players can visit
- **Character**: A non-player entity that exists in a location
- **Item**: An object that can exist in a location or player inventory
- **Selected Adventure**: The adventure currently selected by the administrator using a select command
- **Selected Location**: The location currently selected by the administrator using a select command
- **Admin Context**: The current state of selected adventure and location in admin mode

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to view all locations in the selected adventure, so that I can see what places exist and their basic information

#### Acceptance Criteria

1. WHEN an administrator enters "show locations" in admin mode, THE Terminal Interface SHALL display a formatted list of all locations in the selected adventure
2. THE Terminal Interface SHALL display each location's ID, name, and description in the list
3. IF no adventure is currently selected, THEN THE Terminal Interface SHALL display an error message indicating no adventure is selected
4. THE Terminal Interface SHALL format the output with clear visual separation between location entries
5. THE Terminal Interface SHALL display a count of total locations at the end of the list

### Requirement 2

**User Story:** As an administrator, I want to view characters based on my current context, so that I can see NPCs in the selected adventure or location

#### Acceptance Criteria

1. WHEN an administrator enters "show characters" in admin mode with a selected location, THE Terminal Interface SHALL display only characters in that selected location
2. WHEN an administrator enters "show characters" in admin mode with a selected adventure but no selected location, THE Terminal Interface SHALL display all characters in the selected adventure
3. THE Terminal Interface SHALL display each character's ID, name, location name, and dialogue preview in the list
4. IF no adventure is currently selected, THEN THE Terminal Interface SHALL display an error message indicating no adventure is selected
5. THE Terminal Interface SHALL format the output with clear visual separation between character entries
6. THE Terminal Interface SHALL display a count of total characters shown at the end of the list

### Requirement 3

**User Story:** As an administrator, I want to view items based on my current context, so that I can see objects in the selected adventure or location

#### Acceptance Criteria

1. WHEN an administrator enters "show items" in admin mode with a selected location, THE Terminal Interface SHALL display only items in that selected location
2. WHEN an administrator enters "show items" in admin mode with a selected adventure but no selected location, THE Terminal Interface SHALL display all items in the selected adventure
3. THE Terminal Interface SHALL display each item's ID, name, location name (or "inventory" if held by player), and description in the list
4. IF no adventure is currently selected, THEN THE Terminal Interface SHALL display an error message indicating no adventure is selected
5. THE Terminal Interface SHALL format the output with clear visual separation between item entries
6. THE Terminal Interface SHALL display a count of total items shown at the end of the list

### Requirement 4

**User Story:** As an administrator, I want to select a specific location by ID or name, so that I can view detailed information about that location and set it as my current context

#### Acceptance Criteria

1. WHEN an administrator enters "select location <identifier>" in admin mode, THE Game Engine SHALL set the specified location as the selected location in admin context
2. THE Command Parser SHALL accept both location ID (number) and location name (string) as valid identifiers
3. THE Terminal Interface SHALL display the location's name, description, connected locations, characters present, and items present
4. IF the specified location does not exist in the selected adventure, THEN THE Terminal Interface SHALL display an error message indicating the location was not found
5. IF no adventure is currently selected, THEN THE Terminal Interface SHALL display an error message indicating no adventure is selected
6. THE Terminal Interface SHALL format connected locations as a list with direction and destination name
7. THE Terminal Interface SHALL format characters and items as lists with their names and brief descriptions
8. THE Game Engine SHALL maintain the selected location state until a different location is selected or admin mode is exited

### Requirement 5

**User Story:** As an administrator, I want to view a complete map of the selected adventure, so that I can understand the spatial layout and connections between all locations

#### Acceptance Criteria

1. WHEN an administrator enters "map" in admin mode, THE Terminal Interface SHALL display a visual representation of all locations and their connections in the selected adventure
2. THE Terminal Interface SHALL display each location with its name and ID
3. THE Terminal Interface SHALL display directional connections between locations with clear indicators (north, south, east, west, up, down)
4. IF no adventure is currently selected, THEN THE Terminal Interface SHALL display an error message indicating no adventure is selected
5. THE Terminal Interface SHALL format the map output to be readable and clearly show the adventure structure
6. THE Terminal Interface SHALL indicate the currently selected location (if any) with a visual marker in the map

### Requirement 6

**User Story:** As an administrator, I want these show commands to be documented in the help system, so that I can discover and learn how to use them

#### Acceptance Criteria

1. WHEN an administrator enters "help" in admin mode, THE Terminal Interface SHALL include the show commands in the displayed help text
2. THE Terminal Interface SHALL display usage syntax for "show locations", "show characters", and "show items"
3. THE Terminal Interface SHALL display usage syntax for "select location <id|name>"
4. THE Terminal Interface SHALL display usage syntax for "map"
5. THE Terminal Interface SHALL include brief descriptions of what each command does
6. THE Terminal Interface SHALL explain that show commands are context-aware based on selected adventure and location
7. THE Terminal Interface SHALL group these commands under an appropriate category in the help output
