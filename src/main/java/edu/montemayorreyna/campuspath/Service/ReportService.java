package edu.montemayorreyna.campuspath.Service;

import edu.montemayorreyna.campuspath.Entity.Location;
import edu.montemayorreyna.campuspath.Entity.Report;
import edu.montemayorreyna.campuspath.Entity.User;
import edu.montemayorreyna.campuspath.Repository.LocationRepository;
import edu.montemayorreyna.campuspath.Repository.ReportRepository;
import edu.montemayorreyna.campuspath.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;

    // Report.submit()
    public Report submit(Integer userId, Integer locationId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));

        Report report = new Report();
        report.setUser(user);
        report.setLocation(location);
        report.setMessage(message);
        report.setReportDate(LocalDate.now());
        report.setStatus("PENDING");
        return reportRepository.save(report);
    }

    // Report.updateStatus(status)
    public Report updateStatus(Integer reportId, String status, Integer adminUserId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));
        report.setStatus(status);
        if (adminUserId != null) {
            userRepository.findById(adminUserId).ifPresent(report::setManagedBy);
        }
        return reportRepository.save(report);
    }

    public List<Report> getAllReports() {
        return reportRepository.findAll();
    }

    public List<Report> getReportsByStatus(String status) {
        return reportRepository.findByStatus(status);
    }

    public List<Report> getReportsByUser(Integer userId) {
        return reportRepository.findByUser_UserId(userId);
    }
}