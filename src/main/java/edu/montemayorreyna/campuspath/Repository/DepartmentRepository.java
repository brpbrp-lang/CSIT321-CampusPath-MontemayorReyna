package edu.montemayorreyna.campuspath.Repository;

import edu.montemayorreyna.campuspath.Entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer> {
    List<Department> findByDepartmentNameContainingIgnoreCase(String departmentName);
}
