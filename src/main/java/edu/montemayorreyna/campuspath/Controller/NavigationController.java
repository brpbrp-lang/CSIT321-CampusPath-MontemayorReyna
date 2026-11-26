package edu.montemayorreyna.campuspath.Controller;

import edu.montemayorreyna.campuspath.Entity.NavigationHistory;
import edu.montemayorreyna.campuspath.Service.NavigationService;
import jakarta.servlet.http.HttpSession;
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
    private final SessionAuth sessionAuth;

    // Activity 2: Get Directions (Select Starting Point, Destination, Calculate Route)
    // Visitors can get directions too; history is only saved for the signed-in user.
    @GetMapping("/directions")
    public ResponseEntity<Map<String, Object>> getDirections(
            @RequestParam Integer startLocationId,
            @RequestParam Integer destinationId,
            HttpSession session) {
        Integer userId = sessionAuth.currentUserId(session);
        Map<String, Object> result = navigationService.getDirections(userId, startLocationId, destinationId);
        if (Boolean.FALSE.equals(result.get("valid"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<List<NavigationHistory>> getUserNavigationHistory(@PathVariable Integer userId,
                                                                            HttpSession session) {
        sessionAuth.requireSelfOrAdmin(session, userId);
        return ResponseEntity.ok(navigationService.getUserNavigationHistory(userId));
    }
}
