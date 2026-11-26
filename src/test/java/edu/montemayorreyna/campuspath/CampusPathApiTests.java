package edu.montemayorreyna.campuspath;

import edu.montemayorreyna.campuspath.Entity.Location;
import edu.montemayorreyna.campuspath.Repository.LocationRepository;
import edu.montemayorreyna.campuspath.Repository.NavigationHistoryRepository;
import edu.montemayorreyna.campuspath.Repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end tests of the REST API against an in-memory database filled by DataSeeder.
 * Each test runs in a transaction that is rolled back, so tests don't affect each other.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CampusPathApiTests {

    private static final String ADMIN = "albert.reyna@cit.edu";
    private static final String STUDENT = "john.montemayor@cit.edu";

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired LocationRepository locations;
    @Autowired NavigationHistoryRepository navigationHistory;

    private MockHttpSession login(String email) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"123456\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private int firstLocationId() {
        return locations.findAll().get(0).getLocationId();
    }

    // ---------- sample data & passwords

    @Test
    void seederLoadsSampleDataWithHashedPasswordsAndMapLinks() {
        assertThat(users.count()).isEqualTo(2);
        assertThat(users.findAll()).allSatisfy(u -> assertThat(u.getPassword()).startsWith("$2"));
        assertThat(locations.findAll()).isNotEmpty().allSatisfy(l -> assertThat(l.getMapKey()).isNotBlank());
    }

    @Test
    void passwordsAreNeverSentToTheBrowser() throws Exception {
        MockHttpSession student = login(STUDENT);
        mvc.perform(post("/api/reports").session(student).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"locationId\":" + firstLocationId() + ",\"issueType\":\"Other\",\"message\":\"Test\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.name").exists())
                .andExpect(jsonPath("$.user.password").doesNotExist());
    }

    // ---------- signing in

    @Test
    void loginRejectsWrongPasswordAndSessionRemembersUser() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + ADMIN + "\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.authenticated").value(false));

        MockHttpSession admin = login(ADMIN.toUpperCase());   // email is case-insensitive
        mvc.perform(get("/api/auth/me").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        mvc.perform(post("/api/auth/logout").session(admin)).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    // ---------- who may do what

    @Test
    void onlyAdminsCanChangeCampusData() throws Exception {
        String body = "{\"name\":\"Test Hall\",\"type\":\"Building\",\"description\":\"x\",\"mapKey\":\"nge\"}";

        mvc.perform(post("/api/locations").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/locations").session(login(STUDENT)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/locations").session(login(ADMIN)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mapKey").value("nge"));
    }

    @Test
    void studentsSeeOnlyTheirOwnHistory() throws Exception {
        MockHttpSession student = login(STUDENT);
        int adminId = users.findByEmailIgnoreCase(ADMIN).orElseThrow().getUserId();
        int studentId = users.findByEmailIgnoreCase(STUDENT).orElseThrow().getUserId();

        mvc.perform(get("/api/reports/user/" + studentId).session(student)).andExpect(status().isOk());
        mvc.perform(get("/api/reports/user/" + adminId).session(student)).andExpect(status().isForbidden());
        mvc.perform(get("/api/navigation/history/" + adminId).session(student)).andExpect(status().isForbidden());
        mvc.perform(get("/api/reports").session(student)).andExpect(status().isForbidden());
    }

    // ---------- validation & errors

    @Test
    void invalidInputGetsAClearMessage() throws Exception {
        MockHttpSession admin = login(ADMIN);
        mvc.perform(post("/api/locations").session(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  \",\"type\":\"Building\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Location name is required."));
        mvc.perform(post("/api/locations").session(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"type\":\"Building\",\"mapKey\":\"mars\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(startsWith("mapKey must be one of")));
        mvc.perform(get("/api/locations/999999")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Location not found"));
        mvc.perform(get("/api/locations/search").param("keyword", " ")).andExpect(status().isBadRequest());
    }

    @Test
    void cannotDeleteABuildingThatStillHasRooms() throws Exception {
        int buildingWithRooms = 1;
        mvc.perform(delete("/api/locations/buildings/" + buildingWithRooms).session(login(ADMIN)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("still used")));
    }

    // ---------- reports workflow

    @Test
    void reportWorkflowFromStudentToResolved() throws Exception {
        MockHttpSession student = login(STUDENT);
        String base = "{\"locationId\":" + firstLocationId() + ",";

        mvc.perform(post("/api/reports").session(student).contentType(MediaType.APPLICATION_JSON)
                        .content(base + "\"issueType\":\"Made up\",\"message\":\"x\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/reports").session(student).contentType(MediaType.APPLICATION_JSON)
                        .content(base + "\"issueType\":\"Wrong location\",\"message\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Please describe the issue."));

        MvcResult created = mvc.perform(post("/api/reports").session(student).contentType(MediaType.APPLICATION_JSON)
                        .content(base + "\"issueType\":\"Wrong location\",\"message\":\"Pin is on the wrong building\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.issueType").value("Wrong location"))
                .andReturn();
        String id = created.getResponse().getContentAsString().replaceAll(".*\"reportId\":(\\d+).*", "$1");

        MockHttpSession admin = login(ADMIN);
        mvc.perform(get("/api/reports/summary").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pending").value(greaterThanOrEqualTo(1)));
        mvc.perform(put("/api/reports/" + id + "/status").session(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"done\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/reports/" + id + "/status").session(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"resolved\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.managedBy.email").value(ADMIN));
    }

    // ---------- directions

    @Test
    void directionsValidateAndOnlyStoreSignedInTrips() throws Exception {
        var all = locations.findAll();
        Location a = all.get(0), b = all.get(1);
        long before = navigationHistory.count();

        mvc.perform(get("/api/navigation/directions")
                        .param("startLocationId", a.getLocationId().toString())
                        .param("destinationId", b.getLocationId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destinationLocation.name").value(b.getName()));
        assertThat(navigationHistory.count()).isEqualTo(before);   // visitor: nothing stored

        mvc.perform(get("/api/navigation/directions").session(login(STUDENT))
                        .param("startLocationId", a.getLocationId().toString())
                        .param("destinationId", b.getLocationId().toString()))
                .andExpect(status().isOk());
        assertThat(navigationHistory.count()).isEqualTo(before + 1);

        mvc.perform(get("/api/navigation/directions")
                        .param("startLocationId", a.getLocationId().toString())
                        .param("destinationId", a.getLocationId().toString()))
                .andExpect(status().isBadRequest());
    }
}
