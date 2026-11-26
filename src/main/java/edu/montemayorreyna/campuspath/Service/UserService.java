package edu.montemayorreyna.campuspath.Service;

import edu.montemayorreyna.campuspath.Entity.*;
import edu.montemayorreyna.campuspath.Repository.SearchHistoryRepository;
import edu.montemayorreyna.campuspath.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * The User / Admin operations from the class diagram.
 * Authentication and search history live here; everything else is handed to the
 * service that owns it (LocationService, ReportService, NavigationService), so each
 * rule exists in exactly one place.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final SearchHistoryRepository searchHistoryRepository;
    private final LocationService locationService;
    private final ReportService reportService;
    private final NavigationService navigationService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // --- User Class Diagram Methods ---

    public boolean login(String email, String password) {
        return authenticateUser(email, password).isPresent();
    }

    /**
     * Checks the password against the stored BCrypt hash.
     * Accounts still holding a plain-text password (e.g. inserted by dummy_data.md) are accepted once
     * and immediately re-saved as a hash, so old seed data keeps working and gets upgraded.
     */
    @Transactional
    public Optional<User> authenticateUser(String email, String password) {
        if (email == null || password == null) return Optional.empty();
        return userRepository.findByEmailIgnoreCase(email.trim()).filter(user -> {
            String stored = user.getPassword();
            if (stored == null) return false;
            if (isBcryptHash(stored)) return passwordEncoder.matches(password, stored);
            if (!stored.equals(password)) return false;
            user.setPassword(passwordEncoder.encode(password));
            userRepository.save(user);
            return true;
        });
    }

    public String hashPassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }

    private static boolean isBcryptHash(String value) {
        return value.matches("^\\$2[aby]\\$\\d{2}\\$.{53}$");
    }

    public void logout() {
        // The HTTP session is invalidated in AuthController
    }

    /** Saves a search to the signed-in user's history (visitors' searches are not stored). */
    @Transactional
    public void recordSearch(Integer userId, String keyword) {
        if (userId == null || keyword == null || keyword.isBlank()) return;
        userRepository.findById(userId).ifPresent(user -> {
            SearchHistory history = new SearchHistory();
            history.setUser(user);
            history.setKeyword(keyword.trim().length() > 255 ? keyword.trim().substring(0, 255) : keyword.trim());
            history.setSearchDate(LocalDate.now());
            searchHistoryRepository.save(history);
        });
    }

    @Transactional
    public List<Location> searchLocation(String keyword, Integer userId) {
        recordSearch(userId, keyword);
        return locationService.searchLocation(keyword);
    }

    public Optional<Location> viewLocation(Integer locationId) {
        return Optional.of(locationService.getLocation(locationId));
    }

    @Transactional
    public NavigationHistory requestDirections(Integer userId, Integer locationId, Integer destinationId) {
        return navigationService.recordTrip(userId, locationId, destinationId);
    }

    @Transactional
    public Report submitReport(Integer userId, Integer locationId, String issueType, String message) {
        return reportService.submit(userId, locationId, issueType, message);
    }

    // --- Admin Class Diagram Methods (Admin inherits User) ---

    @Transactional
    public Location addLocation(Location location) {
        return locationService.addLocation(location);
    }

    @Transactional
    public Location updateLocation(Integer locationId, Location updatedLocation) {
        return locationService.updateLocation(locationId, updatedLocation);
    }

    @Transactional
    public void deleteLocation(Integer locationId) {
        locationService.deleteLocation(locationId);
    }

    @Transactional
    public Report manageReport(Integer reportId, String status, Integer adminUserId) {
        return reportService.updateStatus(reportId, status, adminUserId);
    }
}
