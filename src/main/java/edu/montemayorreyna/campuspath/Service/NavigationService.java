package edu.montemayorreyna.campuspath.Service;

import edu.montemayorreyna.campuspath.Entity.Location;
import edu.montemayorreyna.campuspath.Entity.NavigationHistory;
import edu.montemayorreyna.campuspath.Repository.LocationRepository;
import edu.montemayorreyna.campuspath.Repository.NavigationHistoryRepository;
import edu.montemayorreyna.campuspath.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NavigationService {

    private final LocationRepository locationRepository;
    private final NavigationHistoryRepository navigationHistoryRepository;
    private final UserRepository userRepository;

    // Activity 2: Get Directions workflow
    public Map<String, Object> getDirections(Integer userId, Integer startLocationId, Integer destinationId) {
        Map<String, Object> response = new LinkedHashMap<>();

        Optional<Location> startOpt = locationRepository.findById(startLocationId);
        Optional<Location> destOpt = locationRepository.findById(destinationId);

        if (startOpt.isEmpty() || destOpt.isEmpty()) {
            response.put("valid", false);
            response.put("message", "Invalid starting point or destination location.");
            return response;
        }

        Location start = startOpt.get();
        Location destination = destOpt.get();

        String routeGuidance = calculateRoute(start, destination);

        NavigationHistory history = new NavigationHistory();
        if (userId != null) {
            userRepository.findById(userId).ifPresent(history::setUser);
        }
        history.setLocation(start);
        history.setDestination(destination);
        history.setRequestDate(LocalDate.now());
        NavigationHistory savedHistory = navigationHistoryRepository.save(history);

        response.put("valid", true);
        response.put("startLocation", start);
        response.put("destinationLocation", destination);
        response.put("directions", routeGuidance);
        response.put("navigationHistory", savedHistory);
        return response;
    }

    public String calculateRoute(Location start, Location destination) {
        return "Route from " + start.getName() + " (" + start.getType() + ") to "
                + destination.getName() + " (" + destination.getType() + ")";
    }

    public List<NavigationHistory> getUserNavigationHistory(Integer userId) {
        return navigationHistoryRepository.findByUser_UserId(userId);
    }
}