package edu.montemayorreyna.campuspath.Service;

import edu.montemayorreyna.campuspath.Entity.*;
import edu.montemayorreyna.campuspath.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;
    private final BuildingRepository buildingRepository;
    private final RoomRepository roomRepository;
    private final DepartmentRepository departmentRepository;

    // --- Search Class Diagram Method & Activity 1 Workflow ---

    public List<Location> searchLocation(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return locationRepository
                .findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrTypeContainingIgnoreCase(
                        keyword, keyword, keyword);
    }

    // Activity 1: Search for a Classroom
    public Map<String, Object> searchClassroomAndLocations(String keyword) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Location> locations = searchLocation(keyword);
        List<Room> rooms = roomRepository
                .findByRoomNumberContainingIgnoreCaseOrRoomNameContainingIgnoreCase(keyword, keyword);
        List<Building> buildings = buildingRepository.findByBuildingNameContainingIgnoreCase(keyword);
        List<Department> departments = departmentRepository.findByDepartmentNameContainingIgnoreCase(keyword);

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

    public String getCoordinates(Integer locationId) {
        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        return location.getDescription();
    }

    public String getLocationDetails(Integer locationId) {
        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        return location.getName() + " (" + location.getType() + ") - " + location.getDescription();
    }

    // --- Building Class Diagram Methods & Admin Management ---

    public List<Building> getAllBuildings() {
        return buildingRepository.findAll();
    }

    public List<Room> getRooms(Integer buildingId) {
        return roomRepository.findByBuilding_BuildingId(buildingId);
    }

    public String getBuildingDetails(Integer buildingId) {
        Building building = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new IllegalArgumentException("Building not found"));
        return building.getBuildingName() + ": " + building.getDescription();
    }

    public Building addBuilding(Building building) {
        return buildingRepository.save(building);
    }

    public Building updateBuilding(Integer buildingId, Building updatedBuilding) {
        Building existing = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new IllegalArgumentException("Building not found"));
        existing.setBuildingName(updatedBuilding.getBuildingName());
        existing.setDescription(updatedBuilding.getDescription());
        existing.setLocation(updatedBuilding.getLocation());
        return buildingRepository.save(existing);
    }

    public void deleteBuilding(Integer buildingId) {
        buildingRepository.deleteById(buildingId);
    }

    // --- Room Class Diagram Methods & Admin Floor/Room Management ---

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public Room getRoomById(Integer roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));
    }

    public String getRoomDetails(Integer roomId) {
        Room room = getRoomById(roomId);
        String buildingName = room.getBuilding() != null ? room.getBuilding().getBuildingName() : "N/A";
        return "Room " + room.getRoomNumber() + " (" + room.getRoomName() + ") - Floor "
                + room.getFloor() + ", Building: " + buildingName;
    }

    public Room addRoom(Room room) {
        return roomRepository.save(room);
    }

    public Room updateRoom(Integer roomId, Room updatedRoom) {
        Room existing = getRoomById(roomId);
        existing.setBuilding(updatedRoom.getBuilding());
        existing.setDepartment(updatedRoom.getDepartment());
        existing.setRoomNumber(updatedRoom.getRoomNumber());
        existing.setRoomName(updatedRoom.getRoomName());
        existing.setFloor(updatedRoom.getFloor());
        return roomRepository.save(existing);
    }

    public void deleteRoom(Integer roomId) {
        roomRepository.deleteById(roomId);
    }

    // --- Department Class Diagram Methods ---

    public List<Department> getAllDepartments() {
        return departmentRepository.findAll();
    }

    public String getDepartmentDetails(Integer departmentId) {
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new IllegalArgumentException("Department not found"));
        return department.getDepartmentName() + ": " + department.getDescription();
    }
}