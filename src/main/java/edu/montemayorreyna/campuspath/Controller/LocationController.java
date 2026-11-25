package edu.montemayorreyna.campuspath.Controller;

import edu.montemayorreyna.campuspath.Entity.Building;
import edu.montemayorreyna.campuspath.Entity.Department;
import edu.montemayorreyna.campuspath.Entity.Location;
import edu.montemayorreyna.campuspath.Entity.Room;
import edu.montemayorreyna.campuspath.Service.LocationService;
import edu.montemayorreyna.campuspath.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;
    private final UserService userService;

    // --- Use Case 1: Location Search & Browsing ---

    @GetMapping
    public ResponseEntity<List<Location>> browseLocations() {
        return ResponseEntity.ok(locationService.browseLocations());
    }

    // Activity 1: Search for a Classroom / Location
    @GetMapping("/search")
    public ResponseEntity searchLocations(
            @RequestParam String keyword,
            @RequestParam(required = false) Integer userId) {
        if (userId != null) {
            userService.searchLocation(keyword, userId);
        }
        return ResponseEntity.ok(locationService.searchClassroomAndLocations(keyword));
    }

    @GetMapping("/{locationId}")
    public ResponseEntity<?> viewLocationDetails(@PathVariable Integer locationId) {
        return userService.viewLocation(locationId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Location not found")));
    }

    @GetMapping("/{locationId}/details")
    public ResponseEntity getLocationFormattedDetails(@PathVariable Integer locationId) {
        Map<String, String> response = new LinkedHashMap<>();
        response.put("details", locationService.getLocationDetails(locationId));
        response.put("coordinates", locationService.getCoordinates(locationId));
        return ResponseEntity.ok(response);
    }

    // --- View Building / Floor / Room / Department Information ---

    @GetMapping("/buildings")
    public ResponseEntity<List<Building>> getAllBuildings() {
        return ResponseEntity.ok(locationService.getAllBuildings());
    }

    @GetMapping("/buildings/{buildingId}")
    public ResponseEntity getBuildingDetails(@PathVariable Integer buildingId) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("details", locationService.getBuildingDetails(buildingId));
        response.put("rooms", locationService.getRooms(buildingId));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/buildings/{buildingId}/rooms")
    public ResponseEntity<List<Room>> getBuildingRooms(@PathVariable Integer buildingId) {
        return ResponseEntity.ok(locationService.getRooms(buildingId));
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<Room>> getAllRooms() {
        return ResponseEntity.ok(locationService.getAllRooms());
    }

    @GetMapping("/rooms/{roomId}")
    public ResponseEntity getRoomDetails(@PathVariable Integer roomId) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("room", locationService.getRoomById(roomId));
        response.put("details", locationService.getRoomDetails(roomId));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/departments")
    public ResponseEntity<List<Department>> getAllDepartments() {
        return ResponseEntity.ok(locationService.getAllDepartments());
    }

    @GetMapping("/departments/{departmentId}")
    public ResponseEntity getDepartmentDetails(@PathVariable Integer departmentId) {
        return ResponseEntity.ok(Map.of("details", locationService.getDepartmentDetails(departmentId)));
    }

    // --- Use Case 5: Administration (Manage Locations, Buildings & Floors) ---

    @PostMapping
    public ResponseEntity<Location> addLocation(@RequestBody Location location) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.addLocation(location));
    }

    @PutMapping("/{locationId}")
    public ResponseEntity<Location> updateLocation(
            @PathVariable Integer locationId,
            @RequestBody Location location) {
        return ResponseEntity.ok(userService.updateLocation(locationId, location));
    }

    @DeleteMapping("/{locationId}")
    public ResponseEntity deleteLocation(@PathVariable Integer locationId) {
        userService.deleteLocation(locationId);
        return ResponseEntity.ok(Map.of("message", "Location deleted successfully"));
    }

    @PostMapping("/buildings")
    public ResponseEntity<Building> addBuilding(@RequestBody Building building) {
        return ResponseEntity.status(HttpStatus.CREATED).body(locationService.addBuilding(building));
    }

    @PutMapping("/buildings/{buildingId}")
    public ResponseEntity<Building> updateBuilding(
            @PathVariable Integer buildingId,
            @RequestBody Building building) {
        return ResponseEntity.ok(locationService.updateBuilding(buildingId, building));
    }

    @DeleteMapping("/buildings/{buildingId}")
    public ResponseEntity deleteBuilding(@PathVariable Integer buildingId) {
        locationService.deleteBuilding(buildingId);
        return ResponseEntity.ok(Map.of("message", "Building deleted successfully"));
    }

    @PostMapping("/rooms")
    public ResponseEntity<Room> addRoom(@RequestBody Room room) {
        return ResponseEntity.status(HttpStatus.CREATED).body(locationService.addRoom(room));
    }

    @PutMapping("/rooms/{roomId}")
    public ResponseEntity<Room> updateRoom(
            @PathVariable Integer roomId,
            @RequestBody Room room) {
        return ResponseEntity.ok(locationService.updateRoom(roomId, room));
    }

    @DeleteMapping("/rooms/{roomId}")
    public ResponseEntity deleteRoom(@PathVariable Integer roomId) {
        locationService.deleteRoom(roomId);
        return ResponseEntity.ok(Map.of("message", "Room deleted successfully"));
    }
}