package edu.montemayorreyna.campuspath.Controller;

import edu.montemayorreyna.campuspath.Entity.User;
import edu.montemayorreyna.campuspath.Service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final SessionAuth sessionAuth;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials,
                                                     HttpServletRequest request) {
        return userService.authenticateUser(credentials.get("email"), credentials.get("password"))
                .map(user -> {
                    // New session id on login (prevents session fixation)
                    HttpSession old = request.getSession(false);
                    if (old != null) old.invalidate();
                    sessionAuth.signIn(request.getSession(true), user);
                    return ResponseEntity.ok(userInfo(user));
                })
                .orElseGet(() -> {
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("authenticated", false);
                    body.put("message", "Invalid email or password");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
                });
    }

    /** Who is signed in right now (lets the page stay signed in after a refresh). */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(HttpSession session) {
        return ResponseEntity.ok(userInfo(sessionAuth.requireUser(session)));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request) {
        userService.logout();
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    private static Map<String, Object> userInfo(User user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("authenticated", true);
        body.put("userId", user.getUserId());
        body.put("name", user.getName());
        body.put("email", user.getEmail());
        body.put("role", user.getRole());
        return body;
    }
}
