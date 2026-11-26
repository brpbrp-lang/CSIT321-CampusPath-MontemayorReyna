package edu.montemayorreyna.campuspath.Service;

import edu.montemayorreyna.campuspath.Entity.Location;
import edu.montemayorreyna.campuspath.Entity.Report;
import edu.montemayorreyna.campuspath.Entity.User;
import edu.montemayorreyna.campuspath.Repository.LocationRepository;
import edu.montemayorreyna.campuspath.Repository.ReportRepository;
import edu.montemayorreyna.campuspath.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

/** Owns location reports: users submit them, administrators review and resolve them. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    public static final List<String> ISSUE_TYPES = List.of(
            "Wrong location", "Incorrect room information", "Missing location",
            "Incorrect department information", "Other");
    public static final List<String> STATUSES = List.of("PENDING", "REVIEWING", "RESOLVED");
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "reportId");

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;

    // Report.submit()
    @Transactional
    public Report submit(Integer userId, Integer locationId, String issueType, String message) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (locationId == null) throw ApiException.badRequest("Choose the location this report is about.");
        Location location = locationRepository.findById(locationId).orElseThrow(() -> ApiException.notFound("Location"));

        String text = message == null ? "" : message.trim();
        if (text.isEmpty()) throw ApiException.badRequest("Please describe the issue.");
        if (text.length() > 255) throw ApiException.badRequest("Please keep the description under 255 characters.");

        String type = issueType == null || issueType.isBlank() ? "Other" : issueType.trim();
        if (!ISSUE_TYPES.contains(type)) throw ApiException.badRequest("issueType must be one of " + ISSUE_TYPES);

        Report report = new Report();
        report.setUser(user);
        report.setLocation(location);
        report.setIssueType(type);
        report.setMessage(text);
        report.setReportDate(LocalDate.now());
        report.setStatus("PENDING");
        return reportRepository.save(report);
    }

    // Report.updateStatus(status)
    @Transactional
    public Report updateStatus(Integer reportId, String status, Integer adminUserId) {
        String s = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(s)) throw ApiException.badRequest("status must be one of " + STATUSES);
        Report report = reportRepository.findById(reportId).orElseThrow(() -> ApiException.notFound("Report"));
        report.setStatus(s);
        if (adminUserId != null) {
            userRepository.findById(adminUserId).ifPresent(report::setManagedBy);
        }
        return reportRepository.save(report);
    }

    public Report getReport(Integer reportId) {
        return reportRepository.findById(reportId).orElseThrow(() -> ApiException.notFound("Report"));
    }

    public List<Report> getAllReports() {
        return reportRepository.findAll(NEWEST_FIRST);
    }

    public List<Report> getReportsByStatus(String status) {
        String s = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(s)) throw ApiException.badRequest("status must be one of " + STATUSES);
        return reportRepository.findByStatusOrderByReportIdDesc(s);
    }

    public List<Report> getReportsByUser(Integer userId) {
        return reportRepository.findByUser_UserIdOrderByReportIdDesc(userId);
    }

    public long countByStatus(String status) {
        return reportRepository.countByStatus(status);
    }
}
