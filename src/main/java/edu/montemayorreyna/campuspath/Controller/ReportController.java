package edu.montemayorreyna.campuspath.Controller;

import edu.montemayorreyna.campuspath.Entity.Report;
import edu.montemayorreyna.campuspath.Service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    // Use Case 3: Submit Location Report
    @PostMapping
    public ResponseEntity<Report> submitReport(@RequestBody Map<String, Object> payload) {
        Integer userId = Integer.valueOf(payload.get("userId").toString());
        Integer locationId = Integer.valueOf(payload.get("locationId").toString());
        String message = payload.get("message").toString();

        Report created = reportService.submit(userId, locationId, message);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // Use Case 5: Administrator Review & Manage Reports
    @GetMapping
    public ResponseEntity<List<Report>> getAllReports() {
        return ResponseEntity.ok(reportService.getAllReports());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Report>> getReportsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(reportService.getReportsByStatus(status));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Report>> getReportsByUser(@PathVariable Integer userId) {
        return ResponseEntity.ok(reportService.getReportsByUser(userId));
    }

    @PutMapping("/{reportId}/status")
    public ResponseEntity<Report> manageReport(
            @PathVariable Integer reportId,
            @RequestBody Map<String, Object> payload) {
        String status = payload.get("status").toString();
        Integer adminUserId = payload.get("adminUserId") != null
                ? Integer.valueOf(payload.get("adminUserId").toString())
                : null;

        return ResponseEntity.ok(reportService.updateStatus(reportId, status, adminUserId));
    }
}