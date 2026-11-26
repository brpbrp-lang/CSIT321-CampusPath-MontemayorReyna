package edu.montemayorreyna.campuspath.Controller;

import edu.montemayorreyna.campuspath.Entity.User;
import edu.montemayorreyna.campuspath.Repository.UserRepository;
import edu.montemayorreyna.campuspath.Service.ApiException;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Remembers who is logged in using the server-side HTTP session (JSESSIONID cookie).
 * Controllers call requireUser / requireAdmin so the server, not the browser, decides
 * who may submit reports or change campus data.
 */
@Component
@RequiredArgsConstructor
public class SessionAuth {

    private static final String USER_ID = "userId";

    private final UserRepository userRepository;

    public void signIn(HttpSession session, User user) {
        session.setAttribute(USER_ID, user.getUserId());
    }

    public Optional<User> currentUser(HttpSession session) {
        if (session == null) return Optional.empty();
        Object id = session.getAttribute(USER_ID);
        return id instanceof Integer userId ? userRepository.findById(userId) : Optional.empty();
    }

    public Integer currentUserId(HttpSession session) {
        return currentUser(session).map(User::getUserId).orElse(null);
    }

    public User requireUser(HttpSession session) {
        return currentUser(session)
                .orElseThrow(() -> ApiException.unauthorized("Please sign in first."));
    }

    public User requireAdmin(HttpSession session) {
        User user = requireUser(session);
        if (!isAdmin(user)) {
            throw ApiException.forbidden("Only administrators can do this.");
        }
        return user;
    }

    /** Lets a user see their own data, and admins see anyone's. */
    public User requireSelfOrAdmin(HttpSession session, Integer userId) {
        User user = requireUser(session);
        if (!isAdmin(user) && !user.getUserId().equals(userId)) {
            throw ApiException.forbidden("You can only view your own history.");
        }
        return user;
    }

    public static boolean isAdmin(User user) {
        return user.getRole() != null && user.getRole().equalsIgnoreCase("ADMIN");
    }
}
