package edu.montemayorreyna.campuspath.Repository;

import edu.montemayorreyna.campuspath.Entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Integer> {
    List<Room> findByBuilding_BuildingId(Integer buildingId);
    List<Room> findByRoomNumberContainingIgnoreCaseOrRoomNameContainingIgnoreCase(
            String roomNumber, String roomName);
    List<Room> findByDepartment_DepartmentNameContainingIgnoreCase(String departmentName);
}
