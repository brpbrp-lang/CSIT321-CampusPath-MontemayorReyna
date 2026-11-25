package edu.montemayorreyna.campuspath.Controller;

import edu.montemayorreyna.campuspath.Entity.NavigationHistory;
import edu.montemayorreyna.campuspath.Service.NavigationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/navigation")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class NavigationController {

    private final NavigationService navigationService;

    // Activity 2: Get Directions (Select Starting Point, Destination, Calculate Route)
    @GetMapping("/directions")
    public ResponseEntity getDirections(
            @RequestParam(required = false) Integer userId,
            @RequestParam Integer startLocationId,
            @RequestParam Integer destinationId) {
        Map<String, Object> result = navigationService.getDirections(userId, startLocationId, destinationId);
        if (Boolean.FALSE.equals(result.get("valid"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<List<NavigationHistory>> getUserNavigationHistory(@PathVariable Integer userId) {
        return ResponseEntity.ok(navigationService.getUserNavigationHistory(userId));
    }
}