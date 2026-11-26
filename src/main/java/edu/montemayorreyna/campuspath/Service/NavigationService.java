package edu.montemayorreyna.campuspath.Service;

import edu.montemayorreyna.campuspath.Entity.Location;
import edu.montemayorreyna.campuspath.Entity.NavigationHistory;
import edu.montemayorreyna.campuspath.Repository.LocationRepository;
import edu.montemayorreyna.campuspath.Repository.NavigationHistoryRepository;
import edu.montemayorreyna.campuspath.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Owns directions: validates the two places and keeps each user's trip history. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NavigationService {

    private final LocationRepository locationRepository;
    private final NavigationHistoryRepository navigationHistoryRepository;
    private final UserRepository userRepository;

    // Activity 2: Get Directions workflow
    @Transactional
    public Map<String, Object> getDirections(Integer userId, Integer startLocationId, Integer destinationId) {
        NavigationHistory trip = recordTrip(userId, startLocationId, destinationId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("valid", true);
        response.put("startLocation", trip.getLocation());
        response.put("destinationLocation", trip.getDestination());
        response.put("directions", calculateRoute(trip.getLocation(), trip.getDestination()));
        response.put("navigationHistory", trip);
        return response;
    }

    /** Validates the trip and, for signed-in users, saves it to their history. */
    @Transactional
    public NavigationHistory recordTrip(Integer userId, Integer startLocationId, Integer destinationId) {
        Location start = locationRepository.findById(startLocationId)
                .orElseThrow(() -> ApiException.badRequest("Invalid starting point."));
        Location destination = locationRepository.findById(destinationId)
                .orElseThrow(() -> ApiException.badRequest("Invalid destination."));
        if (start.getLocationId().equals(destination.getLocationId())) {
            throw ApiException.badRequest("The starting point and destination are the same place.");
        }

        NavigationHistory trip = new NavigationHistory();
        trip.setLocation(start);
        trip.setDestination(destination);
        trip.setRequestDate(LocalDate.now());
        if (userId == null) {
            return trip;   // visitors get directions, but nothing is stored
        }
        userRepository.findById(userId).ifPresent(trip::setUser);
        return navigationHistoryRepository.save(trip);
    }

    public String calculateRoute(Location start, Location destination) {
        return "Route from " + start.getName() + " (" + start.getType() + ") to "
                + destination.getName() + " (" + destination.getType() + ")";
    }

    public List<NavigationHistory> getUserNavigationHistory(Integer userId) {
        return navigationHistoryRepository.findByUser_UserIdOrderByNavigationIdDesc(userId);
    }
}
