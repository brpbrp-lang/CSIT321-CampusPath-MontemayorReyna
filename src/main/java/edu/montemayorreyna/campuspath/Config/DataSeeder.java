package edu.montemayorreyna.campuspath.Config;

import edu.montemayorreyna.campuspath.Entity.*;
import edu.montemayorreyna.campuspath.Repository.*;
import edu.montemayorreyna.campuspath.Service.MapKeys;
import edu.montemayorreyna.campuspath.Service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Runs on startup.
 * 1. Empty database: loads the CIT-U sample data (same content as dummy_data.md), so a fresh
 *    clone works without running any SQL by hand.
 * 2. Existing database: fills in columns added later (Location.mapKey, Report.issueType).
 * Turn off with campuspath.seed.enabled=false.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "campuspath.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataSeeder implements ApplicationRunner {

    private static final Pattern LEGACY_ISSUE = Pattern.compile("^\\[([^\\]]+)\\]\\s*(.*)$", Pattern.DOTALL);

    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final DepartmentRepository departmentRepository;
    private final BuildingRepository buildingRepository;
    private final RoomRepository roomRepository;
    private final ReportRepository reportRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.count() == 0 && locationRepository.count() == 0) {
            seedSampleData();
        }
        backfillMapKeys();
        backfillIssueTypes();
        fixBuildingNames();
        addCampusDirectoryPlaces();
    }

    // Places from the official CIT-U Campus Directory that the first sample data did not have.
    // {name, description, type, mapKey}
    private static final String[][] DIRECTORY_PLACES = {
            {"T-Rooms", "B4 - T-Rooms, between the Physics Laboratories and LRAC", "Building", "trooms"},
            {"Satellite School Canteen", "B5 - Canteen at the south-west corner, near Allied Engineering", "Facility", "satcanteen"},
            {"Chemical Engineering Building", "B7 - Chemical Engineering Building (west side, by the river)", "Building", "chem"},
            {"Mechanical Engineering Building", "B8 - Mechanical Engineering Building (west side)", "Building", "mech"},
            {"Mining Engineering Building", "B10 - Mining Engineering Building (west side)", "Building", "mining"},
            {"Elementary Pupils Activity Center", "B12 - Activity center for elementary pupils", "Facility", "elemcenter"},
            {"Elementary Guidance & Office", "B15 / B16 - Elementary Guidance Building and Department Office", "Office", "elemoffice"},
            {"Main School Canteen", "B18 - Main School Canteen, north of the quadrangle", "Facility", "canteen"},
            {"Covered Court", "B19 - Covered Court beside the Sports Pavilion", "Facility", "court"},
            {"Lecture Rooms", "B20 - Lecture Rooms south of the SAL Building", "Building", "lecture"},
            {"PE Dressing Room", "B21 - Physical Education Dressing Room", "Facility", "dressing"},
            {"Main Gate", "B22 - Front gate and guard house on N. Bacalso Avenue", "Facility", "gate"},
            {"Food Innovation Center", "B23 - Food Innovation Center beside the Main Canteen", "Facility", "foodlab"},
            {"High School Canteen", "B24 - High School Canteen beside the Gymnasium", "Facility", "hscanteen"},
            {"Elementary Canteen", "B38 - Elementary Canteen", "Facility", "elemcanteen"},
            {"Sports Pavilion", "B42 - Sports Pavilion in the middle of the quadrangle", "Facility", "pavilion"},
    };

    /** Adds the directory places once (on an upgraded database); later deletions by an admin are respected. */
    private void addCampusDirectoryPlaces() {
        List<Location> all = locationRepository.findAll();
        boolean alreadyAdded = all.stream().anyMatch(l -> "trooms".equals(l.getMapKey()) || "pavilion".equals(l.getMapKey()));
        if (alreadyAdded) return;
        int added = 0;
        for (String[] row : DIRECTORY_PLACES) {
            boolean exists = all.stream().anyMatch(l -> row[0].equalsIgnoreCase(l.getName()));
            if (!exists) {
                locationRepository.save(new Location(null, row[0], row[1], row[2], row[3]));
                added++;
            }
        }
        if (added > 0) log.info("Added {} place(s) from the CIT-U Campus Directory", added);
    }

    // The first sample data guessed what NGE, RTL and SAL stand for; the Campus Directory has the real names.
    // Only text that still matches the old sample data is changed.
    private void fixBuildingNames() {
        Map<String, String> fixes = Map.of(
                "New Generation Engineering / Computer Studies Building (South Campus)",
                "B1 - Dr. Nicolas G. Escario Sr. Building, by the main gate. Home of the College of Computer Studies",
                "Rizal Technological / Main Academic Building housing FAO, ETO, OAS, and GDNC/TEST",
                "B2 - Don Rodolfo T. Lizares Sr. Building, housing FAO, ETO, OAS, and GDNC/TEST",
                "Science and Arts Laboratory Building (Northwest Campus)",
                "B9 - Don Simplicio A. Lizares Sr. Building",
                "CIT-U Gymnasium (Northwest Campus)",
                "B11 - School Gymnasium (north-west, by the river)",
                "Elementary Department Building (North Campus)",
                "B13 - Elementary Department Building (north side)",
                "General Physics Laboratory Building",
                "B33 - Physics Laboratories",
                "Learning Resource and Activity Center",
                "B3 - Learning Resource and Activity Center",
                "Academic Building (East Campus)",
                "B17 - New Academic Building (east side)",
                "Gregorio L. Escario Building (East Campus)",
                "B34 - Gregorio L. Escario Building (east side)",
                "Allied Engineering / Health Sciences Building (West Campus)",
                "B6 - Allied Engineering Building (south-west)");
        for (Location l : locationRepository.findAll()) {
            String fixed = fixes.get(l.getDescription());
            if (fixed != null) l.setDescription(fixed);
        }
    }

    private void backfillMapKeys() {
        int updated = 0;
        for (Location l : locationRepository.findAll()) {
            if (l.getMapKey() == null) {
                String key = MapKeys.guess(l.getName(), l.getDescription());
                if (key != null) {
                    l.setMapKey(key);
                    updated++;
                }
            }
        }
        if (updated > 0) log.info("Linked {} location(s) to buildings on the campus map", updated);
    }

    // Reports sent before issueType existed stored it as "[Issue type] message"
    private void backfillIssueTypes() {
        for (Report r : reportRepository.findAll()) {
            if (r.getIssueType() != null) continue;
            Matcher m = LEGACY_ISSUE.matcher(r.getMessage() == null ? "" : r.getMessage());
            if (m.matches() && ReportService.ISSUE_TYPES.contains(m.group(1))) {
                r.setIssueType(m.group(1));
                r.setMessage(m.group(2));
            } else {
                r.setIssueType("Other");
            }
        }
    }

    private void seedSampleData() {
        log.info("Empty database: loading CIT-U sample data");
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        userRepository.saveAll(List.of(
                user("Albert Christian C. Reyna", "albert.reyna@cit.edu", encoder.encode("123456"), "ADMIN"),
                user("John Emmanuel B. Montemayor", "john.montemayor@cit.edu", encoder.encode("123456"), "STUDENT")));

        Map<String, Location> loc = new HashMap<>();
        Object[][] locations = {
                {"NGE BLDG", "New Generation Engineering / Computer Studies Building (South Campus)", "Building", "nge"},
                {"RTL BLDG", "Rizal Technological / Main Academic Building housing FAO, ETO, OAS, and GDNC/TEST", "Building", "rtl"},
                {"GLE BLDG", "Gregorio L. Escario Building (East Campus)", "Building", "gle"},
                {"ACAD BLDG", "Academic Building (East Campus)", "Building", "acad"},
                {"LRAC", "Learning Resource and Activity Center", "Building", "lrac"},
                {"G-PHYSLAB", "General Physics Laboratory Building", "Building", "gphyslab"},
                {"ALLIED BLDG", "Allied Engineering / Health Sciences Building (West Campus)", "Building", "allied"},
                {"LINK", "Campus Connecting Corridor between Allied/LRAC and SAL Building", "Facility", "sal"},
                {"SAL BLDG", "Science and Arts Laboratory Building (Northwest Campus)", "Building", "sal"},
                {"P.E AREA", "Physical Education Open Activity Area", "Facility", "pe"},
                {"GYM", "CIT-U Gymnasium (Northwest Campus)", "Facility", "gym"},
                {"ELEM BLDG", "Elementary Department Building (North Campus)", "Building", "elem"},
                {"CCS Faculty Office", "College of Computer Studies Faculty Office inside NGE Building", "Office", "nge"},
                {"FAO", "Finance and Accounting Office (RTL Building)", "Office", "rtl"},
                {"ETO", "Enrollment Technical Office (RTL Building)", "Office", "rtl"},
                {"OAS", "Office of Admission and Scholarship (RTL Building)", "Office", "rtl"},
                {"GDNC / TEST", "Guidance Center / Testing Area (RTL Building)", "Office", "rtl"},
        };
        for (Object[] row : locations) {
            Location l = new Location(null, (String) row[0], (String) row[1], (String) row[2], (String) row[3]);
            loc.put(l.getName(), locationRepository.save(l));
        }
        for (String[] row : DIRECTORY_PLACES) {
            locationRepository.save(new Location(null, row[0], row[1], row[2], row[3]));
        }

        Map<String, Department> dept = new HashMap<>();
        String[][] departments = {
                {"CCS", "College of Computer Studies", "Department of Information Technology and Computer Science"},
                {"CNAHS", "College of Nursing and Allied Health Sciences", "Allied Health and Nursing Programs"},
                {"CMBA", "College of Management, Business & Accountancy", "Business, Management, and Accountancy Programs"},
                {"CASE", "College of Arts, Sciences, & Education", "General Education, Arts, Sciences, and Teacher Education"},
                {"CEA", "College of Engineering & Architecture", "Engineering and Architecture Programs"},
                {"CCJ", "College of Criminal Justice", "Criminology and Criminal Justice Programs"},
        };
        for (String[] row : departments) {
            dept.put(row[0], departmentRepository.save(new Department(null, row[1], row[2])));
        }

        Map<String, Building> bldg = new HashMap<>();
        String[][] buildings = {
                {"NGE BLDG", "Houses Wildcat Innovation Play Lab, CCS Faculty Office, and NGE Classrooms (Floors 1 to 3)"},
                {"RTL BLDG", "Main quadrangle building housing FAO, ETO, OAS, GDNC/TEST, and classrooms (Floors 1 to 4)"},
                {"GLE BLDG", "East-wing academic building beside ACAD BLDG (Floors 1 to 4)"},
                {"ACAD BLDG", "Main academic lecture building on the east side of campus (Floors 1 to 4)"},
                {"LRAC", "Central Learning Resource and Activity Center (Floors 1 to 3)"},
                {"G-PHYSLAB", "Physics laboratory building adjacent to LRAC (Floors 1 to 2)"},
                {"ALLIED BLDG", "West-wing academic and laboratory building (Floors 1 to 3)"},
                {"LINK", "Connecting hallway linking west-wing buildings to SAL BLDG (Floor 1)"},
                {"SAL BLDG", "Northwest academic and laboratory building near GYM and P.E AREA (Floors 1 to 3)"},
                {"P.E AREA", "Outdoor Physical Education court and activity area"},
                {"GYM", "Main indoor gymnasium and sports complex (Floors 1 to 2)"},
                {"ELEM BLDG", "Elementary school building at the north end of campus (Floors 1 to 3)"},
        };
        for (String[] row : buildings) {
            bldg.put(row[0], buildingRepository.save(new Building(null, row[0], row[1], loc.get(row[0]))));
        }

        Object[][] rooms = {
                {"NGE BLDG", "CCS", "101", "NGE 101", 1}, {"NGE BLDG", "CCS", "102", "NGE 102", 1},
                {"NGE BLDG", "CCS", "103", "NGE 103", 1}, {"NGE BLDG", "CCS", "104", "NGE 104", 1},
                {"NGE BLDG", "CCS", "105", "NGE 105", 1}, {"NGE BLDG", "CCS", "LAB-1", "Wildcat Innovation Play Lab", 1},
                {"NGE BLDG", "CCS", "201", "NGE 201", 2}, {"NGE BLDG", "CCS", "202", "NGE 202", 2},
                {"NGE BLDG", "CCS", "203", "NGE 203", 2}, {"NGE BLDG", "CCS", "204", "NGE 204", 2},
                {"NGE BLDG", "CCS", "205", "NGE 205", 2}, {"NGE BLDG", "CCS", "301", "NGE 301", 3},
                {"NGE BLDG", "CCS", "302", "NGE 302", 3}, {"NGE BLDG", "CCS", "303", "NGE 303", 3},
                {"NGE BLDG", "CCS", "304", "NGE 304", 3}, {"NGE BLDG", "CCS", "305", "NGE 305", 3},
                {"NGE BLDG", "CCS", "FAC-CCS", "CCS Faculty Office", 3},
                {"RTL BLDG", "CMBA", "RTL-101", "FAO - Finance and Accounting Office", 1},
                {"RTL BLDG", "CMBA", "RTL-102", "ETO - Enrollment Technical Office", 1},
                {"RTL BLDG", "CMBA", "RTL-103", "OAS - Office of Admission and Scholarship", 1},
                {"RTL BLDG", "CMBA", "RTL-104", "GDNC / TEST - Guidance Center / Testing Area", 1},
                {"RTL BLDG", "CMBA", "RTL-201", "RTL Lecture Room 201", 2},
                {"RTL BLDG", "CMBA", "RTL-202", "RTL Lecture Room 202", 2},
                {"RTL BLDG", "CMBA", "RTL-301", "CMBA Faculty & Seminar Room 301", 3},
                {"RTL BLDG", "CMBA", "RTL-401", "RTL Case Study Room 401", 4},
                {"GLE BLDG", "CEA", "GLE-101", "GLE Engineering Room 101", 1},
                {"GLE BLDG", "CEA", "GLE-201", "GLE Drafting Studio 201", 2},
                {"GLE BLDG", "CEA", "GLE-301", "GLE Architecture Studio 301", 3},
                {"GLE BLDG", "CEA", "GLE-401", "GLE Design Lab 401", 4},
                {"ACAD BLDG", "CASE", "ACAD-101", "ACAD Lecture Hall 101", 1},
                {"ACAD BLDG", "CCJ", "ACAD-201", "Criminal Justice Moot Court 201", 2},
                {"ACAD BLDG", "CEA", "ACAD-301", "Engineering Lecture Room 301", 3},
                {"ACAD BLDG", "CASE", "ACAD-401", "CASE Graduate Lecture Room 401", 4},
                {"LRAC", "CASE", "LRAC-101", "Main Library & Learning Commons", 1},
                {"LRAC", "CASE", "LRAC-201", "Periodicals & Quiet Study Zone", 2},
                {"LRAC", "CASE", "LRAC-301", "Audio-Visual & Multimedia Hall", 3},
                {"G-PHYSLAB", "CASE", "PHYS-101", "General Physics Laboratory 101", 1},
                {"G-PHYSLAB", "CASE", "PHYS-201", "Electronics & Optics Laboratory 201", 2},
                {"ALLIED BLDG", "CNAHS", "ALLIED-101", "Nursing Skills Laboratory 101", 1},
                {"ALLIED BLDG", "CNAHS", "ALLIED-201", "Allied Health Lecture Room 201", 2},
                {"ALLIED BLDG", "CNAHS", "ALLIED-301", "Clinical Simulation Ward 301", 3},
                {"SAL BLDG", "CASE", "SAL-101", "General Chemistry Laboratory 101", 1},
                {"SAL BLDG", "CASE", "SAL-201", "Biology & Microbiology Laboratory 201", 2},
                {"SAL BLDG", "CASE", "SAL-301", "Natural Sciences Lecture Room 301", 3},
                {"GYM", "CASE", "GYM-101", "Main Gymnasium Court", 1},
                {"GYM", "CASE", "GYM-201", "Upper Bleachers & Fitness Studio", 2},
                {"ELEM BLDG", "CASE", "ELEM-101", "Elementary Classroom 101 (Grades 1-2)", 1},
                {"ELEM BLDG", "CASE", "ELEM-201", "Elementary Classroom 201 (Grades 3-4)", 2},
                {"ELEM BLDG", "CASE", "ELEM-301", "Elementary Classroom 301 (Grades 5-6)", 3},
        };
        for (Object[] row : rooms) {
            roomRepository.save(new Room(null, bldg.get((String) row[0]), dept.get((String) row[1]),
                    (String) row[2], (String) row[3], (Integer) row[4]));
        }
        log.info("Sample data loaded: 2 users, {} locations, {} buildings, {} rooms",
                locations.length, buildings.length, rooms.length);
    }

    private static User user(String name, String email, String passwordHash, String role) {
        User u = new User();
        u.setName(name);
        u.setEmail(email);
        u.setPassword(passwordHash);
        u.setRole(role);
        return u;
    }
}
