package edu.montemayorreyna.campuspath.Repository;

import edu.montemayorreyna.campuspath.Entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Integer> {
    List<Report> findByStatusOrderByReportIdDesc(String status);

    List<Report> findByUser_UserIdOrderByReportIdDesc(Integer userId);

    long countByStatus(String status);
}
