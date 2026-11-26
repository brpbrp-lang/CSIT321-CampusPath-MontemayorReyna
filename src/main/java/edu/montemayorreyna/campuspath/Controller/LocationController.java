package edu.montemayorreyna.campuspath.Controller;

import edu.montemayorreyna.campuspath.Entity.Building;
import edu.montemayorreyna.campuspath.Entity.Department;
import edu.montemayorreyna.campuspath.Entity.Location;
import edu.montemayorreyna.campuspath.Entity.Room;
import edu.montemayorreyna.campuspath.Service.LocationService;
import edu.montemayorreyna.campuspath.Service.UserService;
import jakarta.servlet.http.HttpSession;
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
    private final SessionAuth sessionAuth;

    // --- Use Case 1: Location Search & Browsing ---

    @GetMapping
    public ResponseEntity<List<Location>> browseLocations() {
        return ResponseEntity.ok(locationService.browseLocations());
    }

    // Activity 1: Search for a Classroom / Location
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchLocations(
            @RequestParam String keyword,
            HttpSession session) {
        // Search history is saved for the signed-in user (taken from the session, not the URL)
        Map<String, Object> results = locationService.searchClassroomAndLocations(keyword);
        userService.recordSearch(sessionAuth.currentUserId(session), keyword);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{locationId}")
    public ResponseEntity<Location> viewLocationDetails(@PathVariable Integer locationId) {
        return ResponseEntity.ok(locationService.getLocation(locationId));
    }

    @GetMapping("/{locationId}/details")
    public ResponseEntity<Map<String, String>> getLocationFormattedDetails(@PathVariable Integer locationId) {
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
    public ResponseEntity<Map<String, Object>> getBuildingDetails(@PathVariable Integer buildingId) {
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
    public ResponseEntity<Map<String, Object>> getRoomDetails(@PathVariable Integer roomId) {
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
    public ResponseEntity<Map<String, String>> getDepartmentDetails(@PathVariable Integer departmentId) {
        return ResponseEntity.ok(Map.of("details", locationService.getDepartmentDetails(departmentId)));
    }

    // --- Use Case 5: Administration (Manage Locations, Buildings & Floors) ---

    // Every method below starts with requireAdmin: 401 if not signed in, 403 if not an ADMIN.

    @PostMapping
    public ResponseEntity<Location> addLocation(@RequestBody Location location, HttpSession session) {
        sessionAuth.requireAdmin(session);
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.addLocation(location));
    }

    @PutMapping("/{locationId}")
    public ResponseEntity<Location> updateLocation(
            @PathVariable Integer locationId,
            @RequestBody Location location,
            HttpSession session) {
        sessionAuth.requireAdmin(session);
        return ResponseEntity.ok(userService.updateLocation(locationId, location));
    }

    @DeleteMapping("/{locationId}")
    public ResponseEntity<Map<String, String>> deleteLocation(@PathVariable Integer locationId, HttpSession session) {
        sessionAuth.requireAdmin(session);
        userService.deleteLocation(locationId);
        return ResponseEntity.ok(Map.of("message", "Location deleted successfully"));
    }

    @PostMapping("/buildings")
    public ResponseEntity<Building> addBuilding(@RequestBody Building building, HttpSession session) {
        sessionAuth.requireAdmin(session);
        return ResponseEntity.status(HttpStatus.CREATED).body(locationService.addBuilding(building));
    }

    @PutMapping("/buildings/{buildingId}")
    public ResponseEntity<Building> updateBuilding(
            @PathVariable Integer buildingId,
            @RequestBody Building building,
            HttpSession session) {
        sessionAuth.requireAdmin(session);
        return ResponseEntity.ok(locationService.updateBuilding(buildingId, building));
    }

    @DeleteMapping("/buildings/{buildingId}")
    public ResponseEntity<Map<String, String>> deleteBuilding(@PathVariable Integer buildingId, HttpSession session) {
        sessionAuth.requireAdmin(session);
        locationService.deleteBuilding(buildingId);
        return ResponseEntity.ok(Map.of("message", "Building deleted successfully"));
    }

    @PostMapping("/rooms")
    public ResponseEntity<Room> addRoom(@RequestBody Room room, HttpSession session) {
        sessionAuth.requireAdmin(session);
        return ResponseEntity.status(HttpStatus.CREATED).body(locationService.addRoom(room));
    }

    @PutMapping("/rooms/{roomId}")
    public ResponseEntity<Room> updateRoom(
            @PathVariable Integer roomId,
            @RequestBody Room room,
            HttpSession session) {
        sessionAuth.requireAdmin(session);
        return ResponseEntity.ok(locationService.updateRoom(roomId, room));
    }

    @DeleteMapping("/rooms/{roomId}")
    public ResponseEntity<Map<String, String>> deleteRoom(@PathVariable Integer roomId, HttpSession session) {
        sessionAuth.requireAdmin(session);
        locationService.deleteRoom(roomId);
        return ResponseEntity.ok(Map.of("message", "Room deleted successfully"));
    }
}