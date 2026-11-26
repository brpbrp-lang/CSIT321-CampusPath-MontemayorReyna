package edu.montemayorreyna.campuspath.Controller;

import edu.montemayorreyna.campuspath.Entity.Report;
import edu.montemayorreyna.campuspath.Entity.User;
import edu.montemayorreyna.campuspath.Service.ApiException;
import edu.montemayorreyna.campuspath.Service.ReportService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final SessionAuth sessionAuth;

    // Use Case 3: Submit Location Report (any signed-in user; the reporter is taken from the session)
    @PostMapping
    public ResponseEntity<Report> submitReport(@RequestBody Map<String, Object> payload, HttpSession session) {
        User user = sessionAuth.requireUser(session);
        Report created = reportService.submit(
                user.getUserId(),
                toInteger(payload.get("locationId"), "locationId"),
                text(payload.get("issueType")),
                text(payload.get("message")));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** The choices for the report form's "Issue Type" field. */
    @GetMapping("/issue-types")
    public ResponseEntity<List<String>> issueTypes() {
        return ResponseEntity.ok(ReportService.ISSUE_TYPES);
    }

    // Use Case 5: Administrator Review & Manage Reports

    @GetMapping
    public ResponseEntity<List<Report>> getAllReports(HttpSession session) {
        sessionAuth.requireAdmin(session);
        return ResponseEntity.ok(reportService.getAllReports());
    }

    /** Counts per status, for the admin dashboard. */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Long>> summary(HttpSession session) {
        sessionAuth.requireAdmin(session);
        Map<String, Long> counts = new LinkedHashMap<>();
        long total = 0;
        for (String status : ReportService.STATUSES) {
            long n = reportService.countByStatus(status);
            counts.put(status.toLowerCase(), n);
            total += n;
        }
        counts.put("total", total);
        return ResponseEntity.ok(counts);
    }

    @GetMapping("/{reportId}")
    public ResponseEntity<Report> getReport(@PathVariable Integer reportId, HttpSession session) {
        sessionAuth.requireAdmin(session);
        return ResponseEntity.ok(reportService.getReport(reportId));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Report>> getReportsByStatus(@PathVariable String status, HttpSession session) {
        sessionAuth.requireAdmin(session);
        return ResponseEntity.ok(reportService.getReportsByStatus(status));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Report>> getReportsByUser(@PathVariable Integer userId, HttpSession session) {
        sessionAuth.requireSelfOrAdmin(session, userId);
        return ResponseEntity.ok(reportService.getReportsByUser(userId));
    }

    @PutMapping("/{reportId}/status")
    public ResponseEntity<Report> manageReport(
            @PathVariable Integer reportId,
            @RequestBody Map<String, Object> payload,
            HttpSession session) {
        User admin = sessionAuth.requireAdmin(session);
        return ResponseEntity.ok(reportService.updateStatus(reportId, text(payload.get("status")), admin.getUserId()));
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }

    private static Integer toInteger(Object value, String field) {
        if (value == null) throw ApiException.badRequest(field + " is required");
        try {
            return Integer.valueOf(String.valueOf(value));
        } catch (NumberFormatException e) {
            throw ApiException.badRequest(field + " must be a number");
        }
    }
}
