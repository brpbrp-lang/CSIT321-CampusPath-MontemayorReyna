package edu.montemayorreyna.campuspath.Controller;

import edu.montemayorreyna.campuspath.Entity.User;
import edu.montemayorreyna.campuspath.Service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        Map<String, Object> response = new LinkedHashMap<>();
        Optional<User> userOpt = userService.authenticateUser(email, password);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            response.put("authenticated", true);
            response.put("userId", user.getUserId());
            response.put("name", user.getName());
            response.put("email", user.getEmail());
            response.put("role", user.getRole());
            return ResponseEntity.ok(response);
        }

        response.put("authenticated", false);
        response.put("message", "Invalid email or password");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @PostMapping("/logout")
    public ResponseEntity logout() {
        userService.logout();
        Map<String, String> response = new LinkedHashMap<>();
        response.put("message", "Logged out successfully");
        return ResponseEntity.ok(response);
    }
}