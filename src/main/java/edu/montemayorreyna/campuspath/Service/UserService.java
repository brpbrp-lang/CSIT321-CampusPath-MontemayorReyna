package edu.montemayorreyna.campuspath.Service;

import edu.montemayorreyna.campuspath.Entity.*;
import edu.montemayorreyna.campuspath.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final SearchHistoryRepository searchHistoryRepository;
    private final NavigationHistoryRepository navigationHistoryRepository;
    private final ReportRepository reportRepository;

    // --- User Class Diagram Methods ---

    public boolean login(String email, String password) {
        return userRepository.findByEmailAndPassword(email, password).isPresent();
    }

    public Optional<User> authenticateUser(String email, String password) {
        return userRepository.findByEmailAndPassword(email, password);
    }

    public void logout() {
        // Stateless REST logout hook
    }

    public List<Location> searchLocation(String keyword, Integer userId) {
        if (userId != null) {
            userRepository.findById(userId).ifPresent(user -> {
                SearchHistory history = new SearchHistory();
                history.setUser(user);
                history.setKeyword(keyword);
                history.setSearchDate(LocalDate.now());
                searchHistoryRepository.save(history);
            });
        }
        return locationRepository
                .findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrTypeContainingIgnoreCase(
                        keyword, keyword, keyword);
    }

    public Optional<Location> viewLocation(Integer locationId) {
        return locationRepository.findById(locationId);
    }

    public NavigationHistory requestDirections(Integer userId, Integer locationId, Integer destinationId) {
        Location start = locationRepository.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid starting location"));
        Location destination = locationRepository.findById(destinationId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid destination location"));

        NavigationHistory navigation = new NavigationHistory();
        if (userId != null) {
            userRepository.findById(userId).ifPresent(navigation::setUser);
        }
        navigation.setLocation(start);
        navigation.setDestination(destination);
        navigation.setRequestDate(LocalDate.now());
        return navigationHistoryRepository.save(navigation);
    }

    public Report submitReport(Integer userId, Integer locationId, String message) {
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

    // --- Admin Class Diagram Methods (Admin inherits User) ---

    public Location addLocation(Location location) {
        return locationRepository.save(location);
    }

    public Location updateLocation(Integer locationId, Location updatedLocation) {
        Location existing = locationRepository.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        existing.setName(updatedLocation.getName());
        existing.setDescription(updatedLocation.getDescription());
        existing.setType(updatedLocation.getType());
        return locationRepository.save(existing);
    }

    public void deleteLocation(Integer locationId) {
        locationRepository.deleteById(locationId);
    }

    public Report manageReport(Integer reportId, String status, Integer adminUserId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));
        report.setStatus(status);
        if (adminUserId != null) {
            userRepository.findById(adminUserId).ifPresent(report::setManagedBy);
        }
        return reportRepository.save(report);
    }
}