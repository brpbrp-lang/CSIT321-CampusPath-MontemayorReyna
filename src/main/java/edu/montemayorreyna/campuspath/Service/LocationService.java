package edu.montemayorreyna.campuspath.Service;

import edu.montemayorreyna.campuspath.Entity.*;
import edu.montemayorreyna.campuspath.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Owns campus places: locations, buildings, rooms and departments
 * (searching, browsing and the admin add / edit / delete operations).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LocationService {

    private static final int MAX_TEXT = 255;   // VARCHAR(255) columns

    private final LocationRepository locationRepository;
    private final BuildingRepository buildingRepository;
    private final RoomRepository roomRepository;
    private final DepartmentRepository departmentRepository;

    // --- Search Class Diagram Method & Activity 1 Workflow ---

    public List<Location> searchLocation(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return Collections.emptyList();
        }
        String k = keyword.trim();
        List<Location> found = new ArrayList<>(locationRepository
                .findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrTypeContainingIgnoreCase(k, k, k));
        found.sort(Comparator.comparingInt(l -> relevance(l.getName(), k)));
        return found;
    }

    /** 0 = exact name, 1 = name starts with it, 2 = name contains it, 3 = only the description/type matched. */
    static int relevance(String name, String keyword) {
        String n = name == null ? "" : name.toLowerCase(Locale.ROOT);
        String k = keyword.toLowerCase(Locale.ROOT);
        if (n.equals(k)) return 0;
        if (n.startsWith(k)) return 1;
        if (n.contains(k)) return 2;
        return 3;
    }

    // Activity 1: Search for a Classroom
    public Map<String, Object> searchClassroomAndLocations(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            throw ApiException.badRequest("Type something to search for.");
        }
        String k = keyword.trim();
        List<Location> locations = searchLocation(k);
        List<Room> rooms = new ArrayList<>(roomRepository.findByRoomNumberContainingIgnoreCaseOrRoomNameContainingIgnoreCase(k, k));
        rooms.sort(Comparator.comparingInt((Room r) -> Math.min(relevance(r.getRoomNumber(), k), relevance(r.getRoomName(), k))));
        List<Building> buildings = buildingRepository.findByBuildingNameContainingIgnoreCase(k);
        List<Department> departments = new ArrayList<>(departmentRepository.findByDepartmentNameContainingIgnoreCase(k));
        departments.sort(Comparator.comparingInt(d -> relevance(d.getDepartmentName(), k)));

        Map<String, Object> result = new LinkedHashMap<>();
        if (locations.isEmpty() && rooms.isEmpty() && buildings.isEmpty() && departments.isEmpty()) {
            result.put("found", false);
            result.put("message", "Location not found");
            return result;
        }
        result.put("found", true);
        result.put("locations", locations);
        result.put("rooms", rooms);
        result.put("buildings", buildings);
        result.put("departments", departments);
        return result;
    }

    // --- Location Class Diagram Methods ---

    public List<Location> browseLocations() {
        return locationRepository.findAll();
    }

    public Location getLocation(Integer locationId) {
        return locationRepository.findById(locationId).orElseThrow(() -> ApiException.notFound("Location"));
    }

    public String getCoordinates(Integer locationId) {
        Location location = getLocation(locationId);
        return location.getMapKey() != null ? location.getMapKey() : location.getDescription();
    }

    public String getLocationDetails(Integer locationId) {
        Location location = getLocation(locationId);
        return location.getName() + " (" + location.getType() + ") - " + location.getDescription();
    }

    @Transactional
    public Location addLocation(Location input) {
        Location location = new Location();
        applyLocation(location, input);
        return locationRepository.save(location);
    }

    @Transactional
    public Location updateLocation(Integer locationId, Location input) {
        Location existing = getLocation(locationId);
        applyLocation(existing, input);
        return locationRepository.save(existing);
    }

    @Transactional
    public void deleteLocation(Integer locationId) {
        locationRepository.delete(getLocation(locationId));
        locationRepository.flush();   // surface "still in use" errors here (handled as 409)
    }

    private void applyLocation(Location target, Location input) {
        if (input == null) throw ApiException.badRequest("Location details are required.");
        target.setName(required(input.getName(), "Location name"));
        target.setType(required(input.getType(), "Category"));
        target.setDescription(optional(input.getDescription(), "Description"));
        target.setMapKey(MapKeys.normalize(input.getMapKey()));
    }

    // --- Building Class Diagram Methods & Admin Management ---

    public List<Building> getAllBuildings() {
        return buildingRepository.findAll();
    }

    public Building getBuilding(Integer buildingId) {
        return buildingRepository.findById(buildingId).orElseThrow(() -> ApiException.notFound("Building"));
    }

    public List<Room> getRooms(Integer buildingId) {
        getBuilding(buildingId);   // 404 for an unknown building instead of an empty list
        return roomRepository.findByBuilding_BuildingId(buildingId);
    }

    public String getBuildingDetails(Integer buildingId) {
        Building building = getBuilding(buildingId);
        return building.getBuildingName() + ": " + building.getDescription();
    }

    @Transactional
    public Building addBuilding(Building input) {
        Building building = new Building();
        applyBuilding(building, input);
        return buildingRepository.save(building);
    }

    @Transactional
    public Building updateBuilding(Integer buildingId, Building input) {
        Building existing = getBuilding(buildingId);
        applyBuilding(existing, input);
        return buildingRepository.save(existing);
    }

    @Transactional
    public void deleteBuilding(Integer buildingId) {
        buildingRepository.delete(getBuilding(buildingId));
        buildingRepository.flush();
    }

    private void applyBuilding(Building target, Building input) {
        if (input == null) throw ApiException.badRequest("Building details are required.");
        target.setBuildingName(required(input.getBuildingName(), "Building name"));
        target.setDescription(optional(input.getDescription(), "Description"));
        Integer locationId = input.getLocation() == null ? null : input.getLocation().getLocationId();
        target.setLocation(locationId == null ? null : getLocation(locationId));
    }

    // --- Room Class Diagram Methods & Admin Floor/Room Management ---

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public Room getRoomById(Integer roomId) {
        return roomRepository.findById(roomId).orElseThrow(() -> ApiException.notFound("Room"));
    }

    public String getRoomDetails(Integer roomId) {
        Room room = getRoomById(roomId);
        String buildingName = room.getBuilding() != null ? room.getBuilding().getBuildingName() : "N/A";
        return "Room " + room.getRoomNumber() + " (" + room.getRoomName() + ") - Floor "
                + room.getFloor() + ", Building: " + buildingName;
    }

    @Transactional
    public Room addRoom(Room input) {
        Room room = new Room();
        applyRoom(room, input);
        return roomRepository.save(room);
    }

    @Transactional
    public Room updateRoom(Integer roomId, Room input) {
        Room existing = getRoomById(roomId);
        applyRoom(existing, input);
        return roomRepository.save(existing);
    }

    @Transactional
    public void deleteRoom(Integer roomId) {
        roomRepository.delete(getRoomById(roomId));
        roomRepository.flush();
    }

    private void applyRoom(Room target, Room input) {
        if (input == null) throw ApiException.badRequest("Room details are required.");
        Integer buildingId = input.getBuilding() == null ? null : input.getBuilding().getBuildingId();
        if (buildingId == null) throw ApiException.badRequest("Choose the building this room is in.");
        target.setBuilding(getBuilding(buildingId));
        Integer departmentId = input.getDepartment() == null ? null : input.getDepartment().getDepartmentId();
        target.setDepartment(departmentId == null ? null : getDepartment(departmentId));
        target.setRoomNumber(required(input.getRoomNumber(), "Room number"));
        target.setRoomName(optional(input.getRoomName(), "Room name"));
        Integer floor = input.getFloor();
        if (floor == null || floor < 1 || floor > 20) throw ApiException.badRequest("Floor must be between 1 and 20.");
        target.setFloor(floor);
    }

    // --- Department Class Diagram Methods ---

    public List<Department> getAllDepartments() {
        return departmentRepository.findAll();
    }

    public Department getDepartment(Integer departmentId) {
        return departmentRepository.findById(departmentId).orElseThrow(() -> ApiException.notFound("Department"));
    }

    public String getDepartmentDetails(Integer departmentId) {
        Department department = getDepartment(departmentId);
        return department.getDepartmentName() + ": " + department.getDescription();
    }

    // --- validation helpers ---

    static String required(String value, String field) {
        if (value == null || value.isBlank()) throw ApiException.badRequest(field + " is required.");
        return optional(value, field);
    }

    static String optional(String value, String field) {
        if (value == null) return null;
        String v = value.trim();
        if (v.length() > MAX_TEXT) throw ApiException.badRequest(field + " must be at most " + MAX_TEXT + " characters.");
        return v.isEmpty() ? null : v;
    }
}
